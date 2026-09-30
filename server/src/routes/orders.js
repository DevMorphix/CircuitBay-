import { Hono } from 'hono'
import { z } from 'zod'
import { body, query } from '../middleware/validate.js'
import { limitByIp } from '../middleware/rateLimit.js'
import { requireUser } from '../middleware/auth.js'
import { randomId } from '../lib/crypto.js'
import { HttpError, badRequest, conflict, notFound } from '../lib/errors.js'
import { priceLines } from '../lib/money.js'
import { stateCode } from '../../../src/content/indianStates.js'
import { order as serializeOrder } from '../lib/serializers.js'
import * as s from '../lib/schemas.js'
import { creditNoteResponse, invoiceResponse } from '../services/invoice.js'
import { describeCoupon, isCouponConflict, usableCoupon } from '../services/coupons.js'
import { FULFILMENT_STATUSES, cancelAndRestockStatements, isStockConflict, markOrderPaid, markOrderPaymentFailed } from '../services/orders.js'

export const orders = new Hono()

// Guest access check (tracking, invoices): the order's email, or its
// mobile number in any common format
const lastTenDigits = (v) => v.replace(/\D/g, '').slice(-10)
function contactMatches(order, contact) {
  if (!order) return false
  if (order.contact_email.toLowerCase() === contact.toLowerCase()) return true
  return lastTenDigits(contact).length === 10 && lastTenDigits(order.contact_phone) === lastTenDigits(contact)
}

const cartItems = z
  .array(z.object({ productId: z.string().min(1).max(80), qty: z.number().int().min(1).max(99) }))
  .min(1, 'Your cart is empty.')
  .max(50)
const couponCode = z.string().trim().max(40).optional().or(z.literal('').transform(() => undefined))

// Loads the cart's products (merging duplicate lines) and prices it
async function priceCart(db, items, shippingMethod, coupon) {
  const qtyById = new Map()
  for (const i of items) qtyById.set(i.productId, (qtyById.get(i.productId) ?? 0) + i.qty)
  const ids = [...qtyById.keys()]
  const products = await db.all(`SELECT * FROM products WHERE active = 1 AND id IN (${ids.map(() => '?').join(',')})`, ids)
  const byId = new Map(products.map((p) => [p.id, p]))
  const found = ids.filter((id) => byId.has(id))
  // Tax per line at each product's GST rate (snapshotted on the order lines)
  const totals = priceLines(
    found.map((id) => ({ product: byId.get(id), qty: qtyById.get(id), unitPricePaise: byId.get(id).price_paise, gstRate: byId.get(id).gst_rate })),
    shippingMethod,
    coupon,
  )
  return { ids, qtyById, byId, totals }
}

const totalsOut = (t, coupon) => ({
  subtotal: t.subtotal / 100,
  discount: t.discount / 100,
  shipping: t.shipping / 100,
  tax: t.tax / 100,
  total: t.total / 100,
  coupon: coupon ? { code: coupon.code, summary: describeCoupon(coupon) } : null,
})

// POST /checkout/quote — totals for the cart with a coupon (the cart's
// coupon box). Doesn't check stock or reserve anything.
orders.post(
  '/checkout/quote',
  limitByIp('quote', { limit: 60, windowSec: 600 }),
  body(z.object({ items: cartItems, shippingMethod: z.enum(['standard', 'express']).default('standard'), couponCode, email: s.email.optional() })),
  async (c) => {
    const { db } = c.var.svc
    const d = c.req.valid('json')
    let coupon = null
    if (d.couponCode) {
      const { totals } = await priceCart(db, d.items, d.shippingMethod, null)
      coupon = await usableCoupon(db, d.couponCode, { subtotalPaise: totals.subtotal, email: d.email ?? c.var.user?.email })
    }
    const { totals } = await priceCart(db, d.items, d.shippingMethod, coupon)
    return c.json({ totals: totalsOut(totals, coupon) })
  },
)

const checkoutSchema = z.object({
  items: cartItems,
  contact: z.object({ name: s.name, email: s.email, phone: s.phone }),
  address: z.object({
    line1: z.string().trim().min(3).max(200),
    line2: z.string().trim().max(200).optional(),
    city: z.string().trim().min(2).max(80),
    state: s.indianState,
    pin: s.pin,
  }),
  shippingMethod: z.enum(['standard', 'express']).default('standard'),
  couponCode,
  notes: z.string().trim().max(500).optional(),
})

// POST /checkout — prices the cart on the server (never trust client
// prices), reserves stock, creates a pending order and the payment-provider
// order. The browser then opens Razorpay Checkout with `payment`. The
// stock is held for HOLD_MINUTES; unpaid holds are released by the sweeper.
orders.post('/checkout', limitByIp('checkout', { limit: 20, windowSec: 600 }), body(checkoutSchema), async (c) => {
  const { db, payments } = c.var.svc
  const d = c.req.valid('json')

  const { ids, qtyById, byId, totals: listTotals } = await priceCart(db, d.items, d.shippingMethod, null)
  let totals = listTotals
  const problems = []
  for (const [id, qty] of qtyById) {
    const p = byId.get(id)
    if (!p) problems.push({ productId: id, message: 'This item is no longer available.' })
    else if (p.stock < qty) problems.push({ productId: id, message: p.stock === 0 ? `${p.name} is out of stock.` : `Only ${p.stock} of ${p.name} left.`, available: p.stock })
  }
  if (problems.length) throw conflict('Some items in your cart need attention.', problems)

  const coupon = d.couponCode ? await usableCoupon(db, d.couponCode, { subtotalPaise: totals.subtotal, email: d.contact.email }) : null
  if (coupon) totals = (await priceCart(db, d.items, d.shippingMethod, coupon)).totals
  const lines = totals.lines

  const orderId = randomId(8, 'CB')
  const now = Date.now()

  // 1. Create the order AND reserve stock in one transaction. If another
  //    shopper took the last units a moment ago, the stock CHECK constraint
  //    aborts everything and nothing is written.
  try {
    await db.batch([
      {
        sql: `INSERT INTO orders (id, user_id, status, contact_name, contact_email, contact_phone,
                ship_line1, ship_line2, ship_city, ship_state, ship_pin, shipping_method,
                subtotal_paise, shipping_paise, tax_paise, total_paise, payment_provider,
                place_of_supply, notes, coupon_code, discount_paise, created_at, updated_at)
              VALUES (?, ?, 'pending_payment', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        params: [
          orderId, c.var.user?.id, d.contact.name, d.contact.email, d.contact.phone,
          d.address.line1, d.address.line2, d.address.city, d.address.state, d.address.pin, d.shippingMethod,
          totals.subtotal, totals.shipping, totals.tax, totals.total, payments.name,
          stateCode(d.address.state), d.notes, coupon?.code ?? null, totals.discount, now, now,
        ],
      },
      ...lines.map((l) => ({
        sql: 'INSERT INTO order_items (order_id, product_id, name, unit_price_paise, qty, hsn_code, gst_rate, tax_paise, discount_paise) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        params: [orderId, l.product.id, l.product.name, l.unitPricePaise, l.qty, l.product.hsn_code, l.gstRate, l.taxPaise, l.discountPaise],
      })),
      // Reserve a use of the coupon (the coupon_uses CHECK stops overuse)
      ...(coupon ? [{ sql: 'UPDATE coupons SET used_count = used_count + 1, updated_at = ? WHERE code = ?', params: [now, coupon.code] }] : []),
      ...lines.map((l) => ({
        sql: 'UPDATE products SET stock = stock - ?, updated_at = ? WHERE id = ?',
        params: [l.qty, now, l.product.id],
      })),
      { sql: `INSERT INTO order_events (order_id, status, created_at) VALUES (?, 'pending_payment', ?)`, params: [orderId, now] },
    ])
  } catch (err) {
    if (isCouponConflict(err)) throw badRequest(`${coupon.code} has just been fully used.`, [{ path: 'couponCode', message: `${coupon.code} has just been fully used.` }])
    if (!isStockConflict(err)) throw err
    const fresh = await db.all(`SELECT id, name, stock FROM products WHERE id IN (${ids.map(() => '?').join(',')})`, ids)
    throw conflict(
      'Some items sold out while you were checking out.',
      fresh.filter((p) => p.stock < qtyById.get(p.id)).map((p) => ({ productId: p.id, message: p.stock === 0 ? `${p.name} just sold out.` : `Only ${p.stock} of ${p.name} left.`, available: p.stock })),
    )
  }

  // 2. Create the payment-provider order. If that fails, give the stock back.
  let providerOrder
  try {
    providerOrder = await payments.createOrder({ amountPaise: totals.total, receipt: orderId, notes: { orderId } })
  } catch (err) {
    console.error('payment provider createOrder failed', orderId, err)
    await db.batch(cancelAndRestockStatements(orderId, ['pending_payment'], 'Payment provider unavailable'))
    throw new HttpError(502, 'payment_unavailable', "We couldn't reach the payment gateway. Please try again in a moment.")
  }
  await db.run('UPDATE orders SET payment_order_id = ? WHERE id = ?', [providerOrder.id, orderId])

  return c.json(
    {
      orderId,
      totals: totalsOut(totals, coupon),
      payment: {
        provider: payments.name,
        key: payments.publicKey,
        orderId: providerOrder.id,
        amount: providerOrder.amount, // paise, as Razorpay Checkout expects
        currency: providerOrder.currency,
        name: 'CircuitBay',
        prefill: { name: d.contact.name, email: d.contact.email, contact: d.contact.phone },
      },
    },
    201,
  )
})

// POST /checkout/verify — called by the browser after Razorpay Checkout
// succeeds. Verifies the signature and marks the order paid.
orders.post(
  '/checkout/verify',
  limitByIp('checkout-verify', { limit: 30, windowSec: 600 }),
  body(
    z.object({
      orderId: z.string().min(3).max(40),
      razorpay_order_id: z.string().min(3).max(80),
      razorpay_payment_id: z.string().min(3).max(80),
      razorpay_signature: z.string().min(3).max(200),
    }),
  ),
  async (c) => {
    const svc = c.var.svc
    const d = c.req.valid('json')
    const order = await svc.db.first('SELECT * FROM orders WHERE id = ?', [d.orderId])
    if (!order || order.payment_order_id !== d.razorpay_order_id) throw notFound('Order not found.')

    const valid = await svc.payments.verifyPayment({
      orderId: d.razorpay_order_id,
      paymentId: d.razorpay_payment_id,
      signature: d.razorpay_signature,
    })
    if (!valid) throw badRequest('We could not verify this payment. If money was deducted, it will be refunded automatically.')

    await markOrderPaid(svc, order.id, d.razorpay_payment_id)
    const fresh = await svc.db.first('SELECT * FROM orders WHERE id = ?', [order.id])
    const items = await svc.db.all('SELECT * FROM order_items WHERE order_id = ?', [order.id])
    return c.json({ order: serializeOrder(fresh, items) })
  },
)

// POST /checkout/failed — browser reports a failed/abandoned payment so
// the order shows the right state (webhook also covers this).
orders.post('/checkout/failed', body(z.object({ orderId: z.string().max(40), reason: z.string().max(300).optional() })), async (c) => {
  const { orderId, reason } = c.req.valid('json')
  await markOrderPaymentFailed(c.var.svc, orderId, reason ?? 'Payment not completed')
  return c.json({ ok: true })
})

// GET /orders/track?orderId=&contact= — guest-friendly lookup. The
// contact must match the order's email or phone. Address and contact
// details are not returned.
orders.get(
  '/orders/track',
  limitByIp('track', { limit: 30, windowSec: 900 }),
  query(z.object({ orderId: z.string().trim().min(3).max(40), contact: z.string().trim().min(3).max(254) })),
  async (c) => {
    const { db } = c.var.svc
    const { orderId, contact } = c.req.valid('query')
    const order = await db.first('SELECT orders.*, (SELECT number FROM credit_notes WHERE order_id = orders.id) AS credit_note_no FROM orders WHERE id = ? COLLATE NOCASE', [orderId])
    if (!contactMatches(order, contact)) throw notFound("We couldn't find an order with those details.")

    const [items, events] = await Promise.all([
      db.all('SELECT * FROM order_items WHERE order_id = ?', [order.id]),
      db.all('SELECT * FROM order_events WHERE order_id = ? ORDER BY created_at, id', [order.id]),
    ])
    const full = serializeOrder(order, items, events)
    return c.json({
      order: { id: full.id, status: full.status, invoiceNo: full.invoiceNo, creditNoteNo: full.creditNoteNo, createdAt: full.createdAt, items: full.items, totals: full.totals, shippingMethod: full.shippingMethod, courier: full.courier, trackingNumber: full.trackingNumber, trackingUrl: full.trackingUrl, trackingStatus: full.trackingStatus, events: full.events },
      steps: FULFILMENT_STATUSES,
    })
  },
)

// Signed-in customer's orders
orders.get('/me/orders', requireUser, async (c) => {
  const { db } = c.var.svc
  const rows = await db.all(`SELECT orders.*, (SELECT number FROM credit_notes WHERE order_id = orders.id) AS credit_note_no FROM orders WHERE user_id = ? AND status != 'pending_payment' ORDER BY created_at DESC LIMIT 100`, [c.var.user.id])
  return c.json({ orders: rows.map((o) => serializeOrder(o)) })
})

orders.get('/me/orders/:id', requireUser, async (c) => {
  const { db } = c.var.svc
  const order = await db.first('SELECT orders.*, (SELECT number FROM credit_notes WHERE order_id = orders.id) AS credit_note_no FROM orders WHERE id = ? AND user_id = ?', [c.req.param('id'), c.var.user.id])
  if (!order) throw notFound('Order not found.')
  const [items, events] = await Promise.all([
    db.all('SELECT * FROM order_items WHERE order_id = ?', [order.id]),
    db.all('SELECT * FROM order_events WHERE order_id = ? ORDER BY created_at, id', [order.id]),
  ])
  return c.json({ order: serializeOrder(order, items, events) })
})

// ------------------------------------------------------------ invoices --
// Guest copy: same check as tracking (order id + the order's email or
// phone), sent in the body so personal details stay out of URLs and logs.
orders.post(
  '/orders/invoice',
  limitByIp('invoice', { limit: 30, windowSec: 900 }),
  body(z.object({ orderId: z.string().trim().min(3).max(40), contact: z.string().trim().min(3).max(254) })),
  async (c) => {
    const { orderId, contact } = c.req.valid('json')
    const order = await c.var.svc.db.first('SELECT * FROM orders WHERE id = ? COLLATE NOCASE', [orderId])
    if (!contactMatches(order, contact)) throw notFound("We couldn't find an order with those details.")
    return invoiceResponse(c, order)
  },
)

// Signed-in customer's own invoice
orders.get('/me/orders/:id/invoice', requireUser, async (c) => {
  const order = await c.var.svc.db.first('SELECT * FROM orders WHERE id = ? AND user_id = ?', [c.req.param('id'), c.var.user.id])
  if (!order) throw notFound('Order not found.')
  return invoiceResponse(c, order)
})

// Credit notes — same access rules as invoices
orders.post(
  '/orders/credit-note',
  limitByIp('invoice', { limit: 30, windowSec: 900 }),
  body(z.object({ orderId: z.string().trim().min(3).max(40), contact: z.string().trim().min(3).max(254) })),
  async (c) => {
    const { orderId, contact } = c.req.valid('json')
    const order = await c.var.svc.db.first('SELECT * FROM orders WHERE id = ? COLLATE NOCASE', [orderId])
    if (!contactMatches(order, contact)) throw notFound("We couldn't find an order with those details.")
    return creditNoteResponse(c, order)
  },
)

orders.get('/me/orders/:id/credit-note', requireUser, async (c) => {
  const order = await c.var.svc.db.first('SELECT * FROM orders WHERE id = ? AND user_id = ?', [c.req.param('id'), c.var.user.id])
  if (!order) throw notFound('Order not found.')
  return creditNoteResponse(c, order)
})

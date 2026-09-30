import { Hono } from 'hono'
import { z } from 'zod'
import { body, query } from '../middleware/validate.js'
import { requireAdmin } from '../middleware/auth.js'
import { limitByIp } from '../middleware/rateLimit.js'
import { json, parseJson } from '../db/index.js'
import { randomId } from '../lib/crypto.js'
import { HttpError, badRequest, conflict, notFound } from '../lib/errors.js'
import { rupeesToPaise } from '../lib/money.js'
import { article, mediaUrl, order as serializeOrder, product, project } from '../lib/serializers.js'
import * as s from '../lib/schemas.js'
import { ALLOWED_UPLOAD_TYPES, MAX_UPLOAD_BYTES } from '../storage/index.js'
import { emails } from '../services/email.js'
import { FULFILMENT_STATUSES, cancelAndRestockStatements, creditNoteStatements } from '../services/orders.js'
import { creditNoteResponse, invoiceResponse } from '../services/invoice.js'
import { publicReview, recomputeRatingStatement } from '../services/reviews.js'

// Everything under /api/admin requires role=admin. Admins are the accounts
// whose email is listed in ADMIN_EMAILS when they register.
export const admin = new Hono()
admin.use('*', requireAdmin)
// Any successful admin write invalidates cached public reads
admin.use('*', async (c, next) => {
  await next()
  if (c.req.method !== 'GET' && c.res.status < 400) await c.var.svc.cache.clear()
})

const page = { page: z.coerce.number().int().min(1).default(1), limit: z.coerce.number().int().min(1).max(100).default(25) }

// ------------------------------------------------------------ dashboard --
admin.get('/stats', async (c) => {
  const { db } = c.var.svc
  const since = Date.now() - 30 * 86_400_000
  const [sales, byStatus, lowStock, inbox] = await Promise.all([
    db.first(`SELECT COUNT(*) AS orders, IFNULL(SUM(total_paise), 0) AS revenue FROM orders WHERE paid_at >= ? AND refunded_at IS NULL AND status != 'cancelled'`, [since]),
    db.all(`SELECT status, COUNT(*) AS n FROM orders GROUP BY status`),
    db.all(`SELECT id, name, stock FROM products WHERE active = 1 AND stock < 5 ORDER BY stock LIMIT 20`),
    db.first(`SELECT
        (SELECT COUNT(*) FROM contact_messages WHERE status = 'new') AS messages,
        (SELECT COUNT(*) FROM workshop_requests WHERE status = 'new') AS workshops,
        (SELECT COUNT(*) FROM projects WHERE status = 'pending') AS projects,
        (SELECT COUNT(*) FROM reviews WHERE status = 'pending') AS reviews,
        (SELECT COUNT(*) FROM orders WHERE status = 'cancelled' AND paid_at IS NOT NULL AND refunded_at IS NULL) AS refundsNeeded`),
  ])
  return c.json({
    last30Days: { orders: sales.orders, revenue: sales.revenue / 100 },
    ordersByStatus: Object.fromEntries(byStatus.map((r) => [r.status, r.n])),
    lowStock,
    inbox,
  })
})

// ------------------------------------------------------------- products --
// Admin view adds the raw storage keys the editor needs (public API only
// returns URLs)
const adminProduct = (config) => (p) => ({ ...product(config)(p), imageKeys: parseJson(p.images, []), datasheetKey: p.datasheet_key })

const productIn = z.object({
  id: s.slug,
  name: z.string().trim().min(2).max(160),
  category: z.string().min(1),
  kit: z.boolean().default(false),
  level: z.enum(['Beginner', 'Intermediate', 'Advanced']).nullable().optional(),
  price: z.number().min(0), // rupees
  stock: z.number().int().min(0),
  brand: z.string().trim().max(80).nullable().optional(),
  type: z.string().trim().max(80).nullable().optional(),
  badges: z.array(z.string().max(40)).max(6).default([]),
  forWhat: z.string().trim().max(1000).nullable().optional(),
  build: z.string().trim().max(500).nullable().optional(),
  inside: z.array(z.string().max(120)).max(40).default([]),
  specs: z.record(z.string(), z.string().max(200)).default({}),
  images: z.array(z.string().max(300)).max(12).default([]), // storage keys
  datasheetKey: z.string().max(300).nullable().optional(),
  hsnCode: z.string().trim().regex(/^\d{4,8}$/, 'HSN codes are 4–8 digits.').nullable().optional(),
  gstRate: z.union([z.literal(0), z.literal(5), z.literal(12), z.literal(18), z.literal(28)]).default(18),
  active: z.boolean().default(true),
})

const productParams = (p, now) => [
  p.name, p.category, p.kit ? 1 : 0, p.level ?? null, rupeesToPaise(p.price), p.stock, p.brand ?? null, p.type ?? null,
  json(p.badges), p.forWhat ?? null, p.build ?? null, json(p.inside), json(p.specs), json(p.images), p.datasheetKey ?? null,
  p.active ? 1 : 0, p.hsnCode ?? null, p.gstRate, now,
]

admin.get('/products', query(z.object({ q: z.string().max(100).optional(), ...page })), async (c) => {
  const { db, config } = c.var.svc
  const { q, page: pg, limit } = c.req.valid('query')
  const where = q ? `WHERE name LIKE ? OR id LIKE ?` : ''
  const params = q ? [`%${q}%`, `%${q}%`] : []
  const rows = await db.all(`SELECT * FROM products ${where} ORDER BY updated_at DESC LIMIT ? OFFSET ?`, [...params, limit, (pg - 1) * limit])
  return c.json({ products: rows.map(adminProduct(config)) })
})

admin.get('/products/:id', async (c) => {
  const { db, config } = c.var.svc
  const row = await db.first('SELECT * FROM products WHERE id = ?', [c.req.param('id')])
  if (!row) throw notFound('Product not found.')
  return c.json({ product: adminProduct(config)(row) })
})

admin.post('/products', body(productIn), async (c) => {
  const { db, config } = c.var.svc
  const p = c.req.valid('json')
  if (await db.first('SELECT 1 FROM products WHERE id = ?', [p.id])) throw conflict('A product with this id already exists.')
  if (!(await db.first('SELECT 1 FROM categories WHERE slug = ?', [p.category]))) throw badRequest('Unknown category.')
  const now = Date.now()
  await db.run(
    `INSERT INTO products (name, category, is_kit, level, price_paise, stock, brand, type, badges, for_what, build,
       inside, specs, images, datasheet_key, active, hsn_code, gst_rate, updated_at, id, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [...productParams(p, now), p.id, now],
  )
  return c.json({ product: adminProduct(config)(await db.first('SELECT * FROM products WHERE id = ?', [p.id])) }, 201)
})

admin.put('/products/:id', body(productIn.omit({ id: true })), async (c) => {
  const { db, config } = c.var.svc
  const id = c.req.param('id')
  const p = c.req.valid('json')
  const res = await db.run(
    `UPDATE products SET name = ?, category = ?, is_kit = ?, level = ?, price_paise = ?, stock = ?, brand = ?, type = ?,
       badges = ?, for_what = ?, build = ?, inside = ?, specs = ?, images = ?, datasheet_key = ?, active = ?, hsn_code = ?, gst_rate = ?, updated_at = ?
     WHERE id = ?`,
    [...productParams(p, Date.now()), id],
  )
  if (!res.changes) throw notFound('Product not found.')
  return c.json({ product: adminProduct(config)(await db.first('SELECT * FROM products WHERE id = ?', [id])) })
})

// Quick stock adjustment (e.g. after a delivery arrives)
admin.patch('/products/:id/stock', body(z.object({ stock: z.number().int().min(0) })), async (c) => {
  const res = await c.var.svc.db.run('UPDATE products SET stock = ?, updated_at = ? WHERE id = ?', [c.req.valid('json').stock, Date.now(), c.req.param('id')])
  if (!res.changes) throw notFound('Product not found.')
  return c.json({ ok: true })
})

// Soft delete — products stay referenced by past orders
admin.delete('/products/:id', async (c) => {
  const res = await c.var.svc.db.run('UPDATE products SET active = 0, updated_at = ? WHERE id = ?', [Date.now(), c.req.param('id')])
  if (!res.changes) throw notFound('Product not found.')
  return c.json({ ok: true })
})

admin.put(
  '/categories/:slug',
  body(z.object({ label: z.string().trim().min(1).max(60), icon: z.string().max(40).optional(), blurb: z.string().max(300).optional(), sortOrder: z.number().int().default(0) })),
  async (c) => {
    const d = c.req.valid('json')
    await c.var.svc.db.run(
      `INSERT INTO categories (slug, label, icon, blurb, sort_order) VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(slug) DO UPDATE SET label = excluded.label, icon = excluded.icon, blurb = excluded.blurb, sort_order = excluded.sort_order`,
      [s.slug.parse(c.req.param('slug')), d.label, d.icon, d.blurb, d.sortOrder],
    )
    return c.json({ ok: true })
  },
)

// -------------------------------------------------------------- coupons --
const couponOut = (c) => ({
  code: c.code,
  description: c.description,
  kind: c.kind,
  // percent: the % off; amount: rupees off; free_shipping: 0
  value: c.kind === 'amount' ? c.value / 100 : c.value,
  maxDiscount: c.max_discount_paise == null ? null : c.max_discount_paise / 100,
  minSubtotal: c.min_subtotal_paise / 100,
  startsAt: c.starts_at,
  endsAt: c.ends_at,
  maxUses: c.max_uses,
  perCustomer: c.per_customer,
  usedCount: c.used_count,
  active: Boolean(c.active),
  paidOrders: c.paid_orders ?? 0,
  discountGiven: (c.discount_given ?? 0) / 100,
  createdAt: c.created_at,
})

const couponIn = z
  .object({
    description: z.string().trim().max(200).optional().nullable(),
    kind: z.enum(['percent', 'amount', 'free_shipping']),
    value: z.number().min(0).max(1_000_000).default(0),
    maxDiscount: z.number().positive().max(1_000_000).optional().nullable(),
    minSubtotal: z.number().min(0).max(10_000_000).default(0),
    startsAt: z.number().int().positive().optional().nullable(),
    endsAt: z.number().int().positive().optional().nullable(),
    maxUses: z.number().int().min(1).max(10_000_000).optional().nullable(),
    perCustomer: z.number().int().min(1).max(1000).optional().nullable(),
    active: z.boolean().default(true),
  })
  .superRefine((c, ctx) => {
    if (c.kind === 'percent' && !(Number.isInteger(c.value) && c.value >= 1 && c.value <= 100)) {
      ctx.addIssue({ code: 'custom', path: ['value'], message: 'Enter a whole percentage from 1 to 100.' })
    }
    if (c.kind === 'amount' && !(c.value > 0)) ctx.addIssue({ code: 'custom', path: ['value'], message: 'Enter the amount off in rupees.' })
    if (c.startsAt && c.endsAt && c.endsAt <= c.startsAt) ctx.addIssue({ code: 'custom', path: ['endsAt'], message: 'The end must be after the start.' })
  })

const couponParams = (c, now) => [
  c.description || null,
  c.kind,
  c.kind === 'amount' ? rupeesToPaise(c.value) : c.kind === 'percent' ? c.value : 0,
  c.kind === 'percent' && c.maxDiscount ? rupeesToPaise(c.maxDiscount) : null,
  rupeesToPaise(c.minSubtotal),
  c.startsAt ?? null,
  c.endsAt ?? null,
  c.maxUses ?? null,
  c.perCustomer ?? null,
  c.active ? 1 : 0,
  now,
]

// Usage figures count paid orders only (not abandoned checkouts)
const COUPON_SELECT = `SELECT c.*,
    (SELECT COUNT(*) FROM orders o WHERE o.coupon_code = c.code AND o.paid_at IS NOT NULL AND o.status != 'cancelled') AS paid_orders,
    (SELECT SUM(discount_paise) FROM orders o WHERE o.coupon_code = c.code AND o.paid_at IS NOT NULL AND o.status != 'cancelled') AS discount_given
  FROM coupons c`

admin.get('/coupons', async (c) => {
  const rows = await c.var.svc.db.all(`${COUPON_SELECT} ORDER BY c.active DESC, c.created_at DESC LIMIT 500`)
  return c.json({ coupons: rows.map(couponOut) })
})

admin.post('/coupons', body(couponIn.and(z.object({ code: z.string().trim().toUpperCase().regex(/^[A-Z0-9_-]{3,30}$/, 'Use 3–30 letters, numbers, - or _.') }))), async (c) => {
  const { db } = c.var.svc
  const d = c.req.valid('json')
  if (await db.first('SELECT 1 FROM coupons WHERE code = ?', [d.code])) throw conflict('A coupon with this code already exists.')
  const now = Date.now()
  await db.run(
    `INSERT INTO coupons (description, kind, value, max_discount_paise, min_subtotal_paise, starts_at, ends_at, max_uses, per_customer, active, updated_at, code, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [...couponParams(d, now), d.code, now],
  )
  return c.json({ coupon: couponOut(await db.first(`${COUPON_SELECT} WHERE c.code = ?`, [d.code])) }, 201)
})

// The code itself can't change (past orders refer to it); switch a coupon
// off with `active: false` instead of deleting it.
admin.put('/coupons/:code', body(couponIn), async (c) => {
  const { db } = c.var.svc
  const code = c.req.param('code')
  let res
  try {
    res = await db.run(
      `UPDATE coupons SET description = ?, kind = ?, value = ?, max_discount_paise = ?, min_subtotal_paise = ?, starts_at = ?, ends_at = ?,
         max_uses = ?, per_customer = ?, active = ?, updated_at = ? WHERE code = ?`,
      [...couponParams(c.req.valid('json'), Date.now()), code],
    )
  } catch (err) {
    if (/coupon_uses/.test(String(err?.message))) throw badRequest('The use limit can’t be lower than the times it has already been used.', [{ path: 'maxUses', message: 'Lower than the uses so far.' }])
    throw err
  }
  if (!res.changes) throw notFound('Coupon not found.')
  return c.json({ coupon: couponOut(await db.first(`${COUPON_SELECT} WHERE c.code = ?`, [code])) })
})

// --------------------------------------------------------------- orders --
admin.get('/orders', query(z.object({ status: z.string().optional(), q: z.string().max(100).optional(), ...page })), async (c) => {
  const { db } = c.var.svc
  const { status, q, page: pg, limit } = c.req.valid('query')
  const where = []
  const params = []
  if (status) {
    where.push('status = ?')
    params.push(status)
  }
  if (q) {
    where.push('(id LIKE ? OR contact_email LIKE ? OR contact_phone LIKE ? OR contact_name LIKE ?)')
    params.push(...Array(4).fill(`%${q}%`))
  }
  const w = where.length ? `WHERE ${where.join(' AND ')}` : ''
  const rows = await db.all(`SELECT orders.*, (SELECT number FROM credit_notes WHERE order_id = orders.id) AS credit_note_no FROM orders ${w} ORDER BY created_at DESC LIMIT ? OFFSET ?`, [...params, limit, (pg - 1) * limit])
  return c.json({ orders: rows.map((o) => ({ ...serializeOrder(o), refundedAt: o.refunded_at })) })
})

admin.get('/orders/:id', async (c) => {
  const { db } = c.var.svc
  const o = await db.first('SELECT orders.*, (SELECT number FROM credit_notes WHERE order_id = orders.id) AS credit_note_no FROM orders WHERE id = ?', [c.req.param('id')])
  if (!o) throw notFound('Order not found.')
  const [items, events] = await Promise.all([
    db.all('SELECT * FROM order_items WHERE order_id = ?', [o.id]),
    db.all('SELECT * FROM order_events WHERE order_id = ? ORDER BY created_at, id', [o.id]),
  ])
  return c.json({ order: { ...serializeOrder(o, items, events), paymentProvider: o.payment_provider, paymentOrderId: o.payment_order_id, paymentId: o.payment_id, notes: o.notes, refundedAt: o.refunded_at, refundNote: o.refund_note } })
})

// Advance fulfilment: confirmed → packed → shipped → … Emails the customer.
admin.post(
  '/orders/:id/status',
  body(
    z.object({
      status: z.enum([...FULFILMENT_STATUSES, 'cancelled']),
      note: z.string().trim().max(300).optional(),
      courier: z.string().trim().max(80).optional(),
      trackingNumber: z.string().trim().max(80).optional(),
      notifyCustomer: z.boolean().default(true),
    }),
  ),
  async (c) => {
    const { db, email, config } = c.var.svc
    const d = c.req.valid('json')
    const o = await db.first('SELECT * FROM orders WHERE id = ?', [c.req.param('id')])
    if (!o) throw notFound('Order not found.')
    if (o.status === 'pending_payment' || o.status === 'payment_failed') throw badRequest('This order has not been paid.')
    if (o.status === 'cancelled') throw badRequest('This order is already cancelled.')
    const now = Date.now()
    if (d.status === 'cancelled') {
      // Put the stock back and, if the order was invoiced, issue the GST
      // credit note — all in one transaction. Refund from the order page.
      const reason = d.note ?? 'Cancelled by CircuitBay'
      await db.batch([...cancelAndRestockStatements(o.id, [o.status], reason, now), ...creditNoteStatements(o.id, reason, now)])
    } else {
      await db.batch([
        {
          sql: 'UPDATE orders SET status = ?, courier = COALESCE(?, courier), tracking_number = COALESCE(?, tracking_number), updated_at = ? WHERE id = ?',
          params: [d.status, d.courier, d.trackingNumber, now, o.id],
        },
        { sql: 'INSERT INTO order_events (order_id, status, note, created_at) VALUES (?, ?, ?, ?)', params: [o.id, d.status, d.note, now] },
      ])
    }
    if (d.notifyCustomer) {
      try {
        await email.send({ to: o.contact_email, ...emails.orderStatus(config.SITE_URL, o, d.status) })
      } catch (err) {
        console.error('status email failed', o.id, err)
      }
    }
    return c.json({ ok: true })
  },
)

admin.get('/orders/:id/credit-note', async (c) => {
  const o = await c.var.svc.db.first('SELECT * FROM orders WHERE id = ?', [c.req.param('id')])
  if (!o) throw notFound('Order not found.')
  return creditNoteResponse(c, o)
})

admin.get('/orders/:id/invoice', async (c) => {
  const o = await c.var.svc.db.first('SELECT * FROM orders WHERE id = ?', [c.req.param('id')])
  if (!o) throw notFound('Order not found.')
  return invoiceResponse(c, o)
})

// Record a refund made in the Razorpay dashboard (clears 'refunds needed')
admin.post('/orders/:id/refunded', body(z.object({ note: z.string().trim().max(300).optional() })), async (c) => {
  const { db } = c.var.svc
  const o = await db.first('SELECT status, paid_at, refunded_at FROM orders WHERE id = ?', [c.req.param('id')])
  if (!o) throw notFound('Order not found.')
  if (o.status !== 'cancelled' || !o.paid_at) throw badRequest('Only cancelled, paid orders can be marked refunded. Cancel the order first.')
  if (o.refunded_at) throw conflict('This order is already marked refunded.')
  const now = Date.now()
  const note = c.req.valid('json').note
  // Conditional update so two admins can't both record it
  const res = await db.run('UPDATE orders SET refunded_at = ?, refund_note = ?, updated_at = ? WHERE id = ? AND refunded_at IS NULL', [now, note, now, c.req.param('id')])
  if (!res.changes) throw conflict('This order is already marked refunded.')
  await db.run("INSERT INTO order_events (order_id, status, note, created_at) VALUES (?, 'refunded', ?, ?)", [c.req.param('id'), note ?? 'Refund recorded', now])
  return c.json({ ok: true })
})

// Refund the full amount through the payment provider (Razorpay Refunds
// API). The order is claimed first with a conditional update, so a double
// click or two admins can never send two refunds; if the provider rejects
// it, the claim is released and it can be retried.
admin.post('/orders/:id/refund', limitByIp('refund', { limit: 30, windowSec: 3600 }), body(z.object({ reason: z.string().trim().max(200).optional() })), async (c) => {
  const { db, payments, email, config } = c.var.svc
  const id = c.req.param('id')
  const { reason } = c.req.valid('json')
  const o = await db.first('SELECT * FROM orders WHERE id = ?', [id])
  if (!o) throw notFound('Order not found.')
  if (o.status !== 'cancelled' || !o.paid_at) throw badRequest('Cancel the order first — only cancelled, paid orders can be refunded.')
  if (!o.payment_id) throw badRequest('This order has no payment ID to refund. Refund it in the Razorpay dashboard and record it here.')

  const claimedAt = Date.now()
  const claim = await db.run(
    "UPDATE orders SET refunded_at = ?, refund_note = 'processing', updated_at = ? WHERE id = ? AND refunded_at IS NULL",
    [claimedAt, claimedAt, id],
  )
  if (!claim.changes) throw conflict('This order has already been refunded (or a refund is in progress).')

  let refund
  try {
    refund = await payments.refund({ paymentId: o.payment_id, amountPaise: o.total_paise, notes: { orderId: id, reason: reason ?? 'Order cancelled' } })
  } catch (err) {
    await db.run("UPDATE orders SET refunded_at = NULL, refund_note = NULL WHERE id = ? AND refund_note = 'processing'", [id])
    throw new HttpError(502, 'refund_failed', `Razorpay didn't accept the refund: ${err.message}`)
  }

  const now = Date.now()
  await db.batch([
    { sql: 'UPDATE orders SET refund_note = ?, updated_at = ? WHERE id = ?', params: [refund.id, now, id] },
    { sql: "INSERT INTO order_events (order_id, status, note, created_at) VALUES (?, 'refunded', ?, ?)", params: [id, `Refund ${refund.id} (${refund.status})`, now] },
  ])
  try {
    await email.send({ to: o.contact_email, ...emails.refundIssued(config.SITE_URL, o) })
  } catch (err) {
    console.error('refund email failed', id, err)
  }
  return c.json({ ok: true, refundId: refund.id, status: refund.status })
})

// ------------------------------------------------------ publish the site --
// Product, blog and project pages are prerendered from this API at build
// time; this starts a new build so admin edits go live (~1–2 minutes).
admin.post('/site/rebuild', limitByIp('site-rebuild', { limit: 12, windowSec: 3600 }), async (c) => {
  const { config } = c.var.svc
  if (!config.SITE_DEPLOY_HOOK_URL) {
    throw new HttpError(501, 'not_configured', "Publishing isn't set up yet: add SITE_DEPLOY_HOOK_URL (a Cloudflare Pages deploy hook) to the API settings.")
  }
  const res = await fetch(config.SITE_DEPLOY_HOOK_URL, { method: 'POST' })
  if (!res.ok) throw new HttpError(502, 'deploy_failed', `The site build couldn't be started (HTTP ${res.status}). Try again in a minute.`)
  return c.json({ ok: true, startedAt: Date.now() })
})

// ---------------------------------------------------------- inbound/CRM --
const inboxList = (table) => async (c) => {
  const { status, page: pg, limit } = c.req.valid('query')
  const rows = await c.var.svc.db.all(
    `SELECT * FROM ${table} ${status ? 'WHERE status = ?' : ''} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
    [...(status ? [status] : []), limit, (pg - 1) * limit],
  )
  return c.json({ items: rows })
}
const inboxQuery = query(z.object({ status: z.string().max(20).optional(), ...page }))

admin.get('/contact-messages', inboxQuery, inboxList('contact_messages'))
admin.get('/workshop-requests', inboxQuery, inboxList('workshop_requests'))
admin.get('/newsletter', inboxQuery, inboxList('newsletter_subscribers'))

admin.patch('/contact-messages/:id', body(z.object({ status: z.enum(['new', 'handled']) })), async (c) => {
  await c.var.svc.db.run('UPDATE contact_messages SET status = ? WHERE id = ?', [c.req.valid('json').status, c.req.param('id')])
  return c.json({ ok: true })
})
admin.patch('/workshop-requests/:id', body(z.object({ status: z.enum(['new', 'contacted', 'scheduled', 'closed']) })), async (c) => {
  await c.var.svc.db.run('UPDATE workshop_requests SET status = ? WHERE id = ?', [c.req.valid('json').status, c.req.param('id')])
  return c.json({ ok: true })
})

// -------------------------------------------------------------- reviews --
const adminReview = (r) => ({
  ...publicReview(r),
  status: r.status,
  productId: r.product_id,
  productName: r.product_name,
  orderId: r.order_id,
  customerEmail: r.customer_email,
  updatedAt: r.updated_at,
})

admin.get('/reviews', query(z.object({ status: z.enum(['pending', 'approved', 'rejected']).optional(), ...page })), async (c) => {
  const { status, page: pg, limit } = c.req.valid('query')
  const rows = await c.var.svc.db.all(
    `SELECT r.*, p.name AS product_name, u.email AS customer_email
       FROM reviews r JOIN products p ON p.id = r.product_id LEFT JOIN users u ON u.id = r.user_id
      ${status ? 'WHERE r.status = ?' : ''}
      ORDER BY r.status = 'pending' DESC, r.updated_at DESC LIMIT ? OFFSET ?`,
    [...(status ? [status] : []), limit, (pg - 1) * limit],
  )
  return c.json({ reviews: rows.map(adminReview) })
})

// Approve / reject, and/or post a public reply ('' removes it)
admin.patch(
  '/reviews/:id',
  body(z.object({ status: z.enum(['pending', 'approved', 'rejected']).optional(), reply: z.string().trim().max(2000).optional() })),
  async (c) => {
    const { db } = c.var.svc
    const d = c.req.valid('json')
    const review = await db.first('SELECT product_id FROM reviews WHERE id = ?', [c.req.param('id')])
    if (!review) throw notFound('Review not found.')
    const now = Date.now()
    await db.batch([
      {
        sql: `UPDATE reviews SET status = COALESCE(?, status),
                reply = CASE WHEN ? IS NULL THEN reply WHEN ? = '' THEN NULL ELSE ? END,
                replied_at = CASE WHEN ? IS NULL THEN replied_at WHEN ? = '' THEN NULL ELSE ? END,
                updated_at = ? WHERE id = ?`,
        params: [d.status, d.reply, d.reply, d.reply, d.reply, d.reply, now, now, c.req.param('id')],
      },
      recomputeRatingStatement(review.product_id),
    ])
    const row = await db.first(
      `SELECT r.*, p.name AS product_name, u.email AS customer_email
         FROM reviews r JOIN products p ON p.id = r.product_id LEFT JOIN users u ON u.id = r.user_id WHERE r.id = ?`,
      [c.req.param('id')],
    )
    return c.json({ review: adminReview(row) })
  },
)

// ------------------------------------------------------------- projects --
admin.get('/projects', inboxQuery, async (c) => {
  const { db, config } = c.var.svc
  const { status } = c.req.valid('query')
  const rows = await db.all(`SELECT * FROM projects ${status ? 'WHERE status = ?' : ''} ORDER BY created_at DESC LIMIT 200`, status ? [status] : [])
  return c.json({ projects: rows.map((p) => ({ ...project(config)(p), builderEmail: p.builder_email, imageKey: p.image_key })) })
})

admin.patch(
  '/projects/:id',
  body(
    z.object({
      status: z.enum(['pending', 'published', 'rejected']).optional(),
      featured: z.boolean().optional(),
      title: z.string().trim().max(120).optional(),
      blurb: z.string().trim().max(300).optional(),
      category: z.string().trim().max(40).optional(),
      tags: z.array(z.string().max(40)).max(10).optional(),
      imageKey: z.string().max(300).nullable().optional(),
    }),
  ),
  async (c) => {
    const d = c.req.valid('json')
    const res = await c.var.svc.db.run(
      `UPDATE projects SET status = COALESCE(?, status), featured = COALESCE(?, featured), title = COALESCE(?, title),
         blurb = COALESCE(?, blurb), category = COALESCE(?, category), tags = COALESCE(?, tags),
         image_key = CASE WHEN ? THEN ? ELSE image_key END, updated_at = ?
       WHERE id = ?`,
      [d.status, d.featured == null ? null : d.featured ? 1 : 0, d.title, d.blurb, d.category, d.tags ? json(d.tags) : null,
        d.imageKey !== undefined ? 1 : 0, d.imageKey ?? null, Date.now(), c.req.param('id')],
    )
    if (!res.changes) throw notFound('Project not found.')
    return c.json({ ok: true })
  },
)

// ------------------------------------------------------------- articles --
const articleIn = z.object({
  title: z.string().trim().min(2).max(200),
  seoTitle: z.string().trim().max(60).optional(),
  category: z.string().trim().min(1).max(60),
  excerpt: z.string().trim().max(400).optional(),
  // Same block types the site renders (src/pages/Article.jsx)
  body: z
    .array(
      z.discriminatedUnion('type', [
        z.object({ type: z.enum(['h2', 'p', 'code', 'diagram']), text: z.string().max(20000), id: z.string().max(80).optional() }),
        // src: a web address or an on-site path (the renderer rejects anything else)
        z.object({ type: z.literal('image'), text: z.string().max(500).default(''), src: z.string().max(1000).regex(/^(https?:\/\/|\/(?!\/))/, 'Use a web address for the image.') }),
        z.object({ type: z.literal('list'), ordered: z.boolean().optional(), items: z.array(z.string().max(2000)).min(1).max(50) }),
        z.object({ type: z.literal('table'), head: z.array(z.string().max(200)).min(1).max(8), rows: z.array(z.array(z.string().max(500)).max(8)).min(1).max(60) }),
      ]),
    )
    .max(300),
  readTime: z.number().int().min(1).max(120).optional(),
  author: z.string().trim().max(80).optional(),
  coverKey: z.string().max(300).nullable().optional(),
  featured: z.boolean().default(false),
  parts: z.array(z.string().max(80)).max(30).default([]),
  relatedProjects: z.array(z.string().max(80)).max(10).default([]),
  status: z.enum(['draft', 'published']).default('draft'),
  publishedAt: z.number().int().optional(), // unix ms; defaults to now when publishing
})

admin.get('/articles', async (c) => {
  const { db, config } = c.var.svc
  const rows = await db.all('SELECT * FROM articles ORDER BY updated_at DESC LIMIT 200')
  return c.json({ articles: rows.map(article(config)) })
})

// Full article (with body blocks and the raw cover key) for the editor
admin.get('/articles/:slug', async (c) => {
  const { db, config } = c.var.svc
  const row = await db.first('SELECT * FROM articles WHERE slug = ?', [c.req.param('slug')])
  if (!row) throw notFound('Article not found.')
  return c.json({ article: { ...article(config, { withBody: true })(row), coverKey: row.cover_key, publishedAt: row.published_at } })
})

admin.put('/articles/:slug', body(articleIn), async (c) => {
  const { db, config } = c.var.svc
  const slug = s.slug.parse(c.req.param('slug'))
  const d = c.req.valid('json')
  const now = Date.now()
  const existing = await db.first('SELECT published_at FROM articles WHERE slug = ?', [slug])
  const publishedAt = d.status === 'published' ? (d.publishedAt ?? existing?.published_at ?? now) : (d.publishedAt ?? null)
  await db.run(
    `INSERT INTO articles (slug, title, seo_title, category, excerpt, body, read_time, author, cover_key, featured, parts, related_projects, status, published_at, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(slug) DO UPDATE SET title = excluded.title, seo_title = excluded.seo_title, category = excluded.category, excerpt = excluded.excerpt,
       body = excluded.body, read_time = excluded.read_time, author = excluded.author, cover_key = excluded.cover_key,
       featured = excluded.featured, parts = excluded.parts, related_projects = excluded.related_projects,
       status = excluded.status, published_at = excluded.published_at, updated_at = excluded.updated_at`,
    [slug, d.title, d.seoTitle || null, d.category, d.excerpt, json(d.body), d.readTime, d.author, d.coverKey ?? null, d.featured ? 1 : 0,
      json(d.parts), json(d.relatedProjects), d.status, publishedAt, now, now],
  )
  return c.json({ article: article(config, { withBody: true })(await db.first('SELECT * FROM articles WHERE slug = ?', [slug])) })
})

admin.delete('/articles/:slug', async (c) => {
  const res = await c.var.svc.db.run('DELETE FROM articles WHERE slug = ?', [c.req.param('slug')])
  if (!res.changes) throw notFound('Article not found.')
  return c.json({ ok: true })
})

// -------------------------------------------------------------- uploads --
// POST /admin/uploads (multipart/form-data, field "file", optional
// "folder": products | articles | projects | datasheets). Stores in R2
// and returns the key (save it on the product/article) and a public URL.
admin.post('/uploads', async (c) => {
  const { storage, db, config } = c.var.svc
  const form = await c.req.formData().catch(() => null)
  const file = form?.get('file')
  if (!file || typeof file === 'string') throw badRequest('Attach a file in the "file" field.')
  const ext = ALLOWED_UPLOAD_TYPES[file.type]
  if (!ext) throw badRequest(`Unsupported file type. Allowed: ${Object.keys(ALLOWED_UPLOAD_TYPES).join(', ')}`)
  if (file.size > MAX_UPLOAD_BYTES) throw badRequest('File is larger than 10 MB.')

  const folder = ['products', 'articles', 'projects', 'datasheets'].includes(form.get('folder')) ? form.get('folder') : 'misc'
  const d = new Date()
  const key = `${folder}/${d.getUTCFullYear()}/${String(d.getUTCMonth() + 1).padStart(2, '0')}/${randomId(16).toLowerCase()}.${ext}`
  await storage.put(key, await file.arrayBuffer(), { contentType: file.type })
  await db.run('INSERT INTO uploads (key, content_type, size, uploaded_by, created_at) VALUES (?, ?, ?, ?, ?)', [key, file.type, file.size, c.var.user.id, Date.now()])
  return c.json({ key, url: mediaUrl(config, key), contentType: file.type, size: file.size }, 201)
})

admin.delete('/uploads/*', async (c) => {
  const key = c.req.path.replace(/^.*?\/uploads\//, '')
  await c.var.svc.storage.delete(key)
  await c.var.svc.db.run('DELETE FROM uploads WHERE key = ?', [key])
  return c.json({ ok: true })
})

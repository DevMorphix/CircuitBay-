import { emails } from './email.js'
import { financialYear } from '../lib/money.js'

// Issues the next sequential GST invoice number for a paid order, e.g.
// 'CB/26-27/000042' (15 chars; GST allows up to 16). Both statements
// re-check the order inside the transaction, so a number is only consumed
// when it's actually assigned — no gaps, no duplicates, even if the
// webhook and the browser confirm the same payment at once.
export function invoiceStatements(orderId, now = Date.now()) {
  const fy = financialYear(now)
  const eligible = "EXISTS (SELECT 1 FROM orders WHERE id = ? AND invoice_no IS NULL AND paid_at IS NOT NULL AND status != 'cancelled')"
  return [
    {
      sql: `INSERT INTO invoice_counters (fy, last) SELECT ?, 1 WHERE ${eligible}
            ON CONFLICT(fy) DO UPDATE SET last = last + 1`,
      params: [fy, orderId],
    },
    {
      sql: `UPDATE orders SET invoice_no = (SELECT 'CB/' || fy || '/' || printf('%06d', last) FROM invoice_counters WHERE fy = ?), invoiced_at = ?
            WHERE id = ? AND invoice_no IS NULL AND paid_at IS NOT NULL AND status != 'cancelled'`,
      params: [fy, now, orderId],
    },
  ]
}

// Issues a full-value GST credit note for a cancelled order that already has
// a tax invoice, e.g. 'CN/26-27/000001'. Guarded like invoiceStatements:
// the number is only consumed if the note is actually created, and an order
// can only ever get one. Run in the same batch as the cancellation.
export function creditNoteStatements(orderId, reason, now = Date.now()) {
  const fy = financialYear(now)
  const eligible = `EXISTS (SELECT 1 FROM orders WHERE id = ? AND status = 'cancelled' AND invoice_no IS NOT NULL)
                    AND NOT EXISTS (SELECT 1 FROM credit_notes WHERE order_id = ?)`
  return [
    {
      sql: `INSERT INTO credit_note_counters (fy, last) SELECT ?, 1 WHERE ${eligible}
            ON CONFLICT(fy) DO UPDATE SET last = last + 1`,
      params: [fy, orderId, orderId],
    },
    {
      sql: `INSERT INTO credit_notes (number, order_id, invoice_no, reason, subtotal_paise, discount_paise, shipping_paise, tax_paise, total_paise, issued_at)
            SELECT (SELECT 'CN/' || fy || '/' || printf('%06d', last) FROM credit_note_counters WHERE fy = ?),
                   id, invoice_no, ?, subtotal_paise, discount_paise, shipping_paise, tax_paise, total_paise, ?
            FROM orders WHERE id = ? AND ${eligible}`,
      params: [fy, reason, now, orderId, orderId, orderId],
    },
  ]
}

// Stock model: checkout RESERVES stock (decrements immediately, atomically
// — the `stock >= 0` CHECK constraint makes an oversell abort the whole
// batch). Unpaid orders hold stock for HOLD_MINUTES, then the sweeper
// cancels them and puts the stock back. Payment never touches stock,
// except for a late payment on an already-released order.
export const HOLD_MINUTES = 30

export const isStockConflict = (err) => /CHECK constraint failed|constraint failed.*stock/i.test(String(err?.message ?? err))

const PENDING = `('pending_payment', 'payment_failed')`

// Moves an order to `placed` exactly once, no matter how many times it's
// called (browser callback + webhook both call it). Returns true if this
// call did the transition.
export async function markOrderPaid(svc, orderId, paymentId) {
  const { db } = svc
  const now = Date.now()
  const res = await db.run(
    `UPDATE orders SET status = 'placed', payment_id = ?, paid_at = ?, updated_at = ?
      WHERE id = ? AND status IN ${PENDING}`,
    [paymentId, now, now, orderId],
  )
  if (res.changes === 1) {
    await db.batch([
      { sql: `INSERT INTO order_events (order_id, status, note, created_at) VALUES (?, 'placed', 'Payment received', ?)`, params: [orderId, now] },
      ...invoiceStatements(orderId, now),
    ])
    await sendConfirmation(svc, orderId)
    return true
  }
  return placeLatePayment(svc, orderId, paymentId)
}

// Payment arrived after the hold expired and the sweeper released the
// stock. Try to re-reserve; if it's gone, flag the order for a refund.
async function placeLatePayment(svc, orderId, paymentId) {
  const { db } = svc
  const order = await db.first('SELECT status, paid_at FROM orders WHERE id = ?', [orderId])
  if (!order || order.status !== 'cancelled' || order.paid_at) return false

  const now = Date.now()
  const items = await db.all('SELECT * FROM order_items WHERE order_id = ?', [orderId])
  const stillCancelled = `EXISTS (SELECT 1 FROM orders WHERE id = ? AND status = 'cancelled' AND paid_at IS NULL)`
  try {
    // Every statement re-checks the order state inside the transaction, so
    // two concurrent late callbacks can't both take stock.
    await db.batch([
      ...items.map((i) => ({
        sql: `UPDATE products SET stock = stock - ?, updated_at = ? WHERE id = ? AND ${stillCancelled}`,
        params: [i.qty, now, i.product_id, orderId],
      })),
      {
        sql: `INSERT INTO order_events (order_id, status, note, created_at)
              SELECT ?, 'placed', 'Payment received after the hold expired', ? WHERE ${stillCancelled}`,
        params: [orderId, now, orderId],
      },
      // Take the coupon use back too — unless it's used up since, in which
      // case the customer (who has paid) still keeps their discount
      {
        sql: `UPDATE coupons SET used_count = used_count + 1, updated_at = ?
               WHERE code = (SELECT coupon_code FROM orders WHERE id = ?) AND (max_uses IS NULL OR used_count < max_uses) AND ${stillCancelled}`,
        params: [now, orderId, orderId],
      },
      {
        sql: `UPDATE orders SET status = 'placed', payment_id = ?, paid_at = ?, updated_at = ? WHERE id = ? AND status = 'cancelled' AND paid_at IS NULL`,
        params: [paymentId, now, now, orderId],
      },
      ...invoiceStatements(orderId, now),
    ])
  } catch (err) {
    if (!isStockConflict(err)) throw err
    // Out of stock now: keep it cancelled, record the payment, flag refund
    const flagged = await db.run(`UPDATE orders SET payment_id = ?, paid_at = ?, updated_at = ? WHERE id = ? AND status = 'cancelled' AND paid_at IS NULL`, [
      paymentId,
      now,
      now,
      orderId,
    ])
    if (flagged.changes) {
      await db.run(`INSERT INTO order_events (order_id, status, note, created_at) VALUES (?, 'needs_refund', 'Paid after the hold expired and stock ran out — refund required', ?)`, [orderId, now])
    }
    return false
  }
  const placed = await db.first(`SELECT status FROM orders WHERE id = ?`, [orderId])
  if (placed?.status !== 'placed') return false
  await sendConfirmation(svc, orderId)
  return true
}

async function sendConfirmation(svc, orderId) {
  const { db, email, config } = svc
  const [order, items] = await Promise.all([
    db.first('SELECT * FROM orders WHERE id = ?', [orderId]),
    db.all('SELECT * FROM order_items WHERE order_id = ?', [orderId]),
  ])
  try {
    await email.send({ to: order.contact_email, ...emails.orderConfirmed(config.SITE_URL, order, items) })
  } catch (err) {
    console.error('order confirmation email failed', orderId, err)
  }
}

export async function markOrderPaymentFailed(svc, orderId, reason) {
  // Stock stays reserved so the customer can retry within the hold window
  const now = Date.now()
  const res = await svc.db.run(`UPDATE orders SET status = 'payment_failed', updated_at = ? WHERE id = ? AND status = 'pending_payment'`, [now, orderId])
  if (res.changes === 1) {
    await svc.db.run(`INSERT INTO order_events (order_id, status, note, created_at) VALUES (?, 'payment_failed', ?, ?)`, [orderId, reason?.slice(0, 300), now])
  }
}

// Statements that cancel an order and return its reserved stock and coupon
// use — but only if it's still in one of `fromStatuses` (checked inside the
// transaction).
export function cancelAndRestockStatements(orderId, fromStatuses, note, now = Date.now()) {
  const list = fromStatuses.map((s) => `'${s}'`).join(', ')
  const guard = `EXISTS (SELECT 1 FROM orders WHERE id = ? AND status IN (${list}))`
  return [
    {
      sql: `INSERT INTO order_events (order_id, status, note, created_at) SELECT ?, 'cancelled', ?, ? WHERE ${guard}`,
      params: [orderId, note, now, orderId],
    },
    {
      sql: `UPDATE products SET stock = stock + (SELECT qty FROM order_items oi WHERE oi.order_id = ? AND oi.product_id = products.id), updated_at = ?
             WHERE id IN (SELECT product_id FROM order_items WHERE order_id = ?) AND ${guard}`,
      params: [orderId, now, orderId, orderId],
    },
    {
      sql: `UPDATE coupons SET used_count = MAX(used_count - 1, 0), updated_at = ?
             WHERE code = (SELECT coupon_code FROM orders WHERE id = ?) AND ${guard}`,
      params: [now, orderId, orderId],
    },
    {
      sql: `UPDATE orders SET status = 'cancelled', updated_at = ? WHERE id = ? AND status IN (${list})`,
      params: [now, orderId],
    },
  ]
}

// Sweeper: release stock held by checkouts that weren't paid in time.
export async function releaseExpiredHolds(db, now = Date.now()) {
  const expired = await db.all(`SELECT id FROM orders WHERE status IN ${PENDING} AND created_at < ? LIMIT 500`, [now - HOLD_MINUTES * 60_000])
  for (const { id } of expired) {
    await db.batch(cancelAndRestockStatements(id, ['pending_payment', 'payment_failed'], 'Payment not completed in time', now))
  }
  return expired.length
}

// Customer-visible fulfilment flow (tracking page timeline)
export const FULFILMENT_STATUSES = ['placed', 'confirmed', 'packed', 'shipped', 'out_for_delivery', 'delivered']

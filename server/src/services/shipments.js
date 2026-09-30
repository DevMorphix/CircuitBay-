import { conflict, badRequest, HttpError } from '../lib/errors.js'
import { emails } from './email.js'
import { FULFILMENT_STATUSES } from './orders.js'
import { isCourierProblem, mapCourierStatus } from './courier.js'

const BOOKABLE = ['placed', 'confirmed', 'packed']
const IN_FLIGHT = ['packed', 'shipped', 'out_for_delivery']
const POLL_EVERY_MS = 3 * 3_600_000 // backstop for missed webhooks

async function notify(svc, order, status) {
  try {
    await svc.email.send({ to: order.contact_email, ...emails.orderStatus(svc.config.SITE_URL, order, status) })
  } catch (err) {
    console.error('status email failed', order.id, err)
  }
}

// Book a courier pickup for a paid order: creates the courier's order,
// gets the AWB and label, and marks our order packed. Only one booking per
// order, even if two people click at once.
export async function bookShipment(svc, orderId) {
  const { db, courier, config } = svc
  if (!courier) throw badRequest('No courier is connected (COURIER_PROVIDER=manual). Enter the courier and tracking number by hand.')
  const o = await db.first('SELECT * FROM orders WHERE id = ?', [orderId])
  if (!o) throw new HttpError(404, 'not_found', 'Order not found.')
  if (!BOOKABLE.includes(o.status)) throw badRequest(`Only paid orders that haven't shipped can be booked (this one is ${o.status.replace(/_/g, ' ')}).`)

  // Claim the booking first so a double click can't book twice
  const claim = await db.run('UPDATE orders SET courier_provider = ?, updated_at = ? WHERE id = ? AND courier_provider IS NULL', [courier.name, Date.now(), orderId])
  if (!claim.changes) throw conflict('A shipment is already booked for this order.')

  let booked
  try {
    const items = await db.all(
      `SELECT oi.*, p.weight_grams FROM order_items oi LEFT JOIN products p ON p.id = oi.product_id WHERE oi.order_id = ? ORDER BY oi.rowid`,
      [orderId],
    )
    const weightGrams = items.reduce((n, i) => n + (i.weight_grams ?? config.SHIP_DEFAULT_WEIGHT_GRAMS) * i.qty, 0)
    booked = await courier.book({ order: o, items, weightGrams, box: config.SHIP_BOX_CM.split('x').map(Number) })
  } catch (err) {
    await db.run('UPDATE orders SET courier_provider = NULL WHERE id = ?', [orderId])
    throw new HttpError(502, 'courier_failed', `The courier booking failed: ${err.message}`)
  }

  const now = Date.now()
  const moveToPacked = o.status !== 'packed'
  await db.batch([
    {
      sql: `UPDATE orders SET courier_order_id = ?, shipment_id = ?, tracking_number = ?, courier = ?, label_url = ?, tracking_url = ?,
              tracking_status = 'AWB ASSIGNED', tracking_checked_at = ?, status = CASE WHEN status IN ('placed', 'confirmed') THEN 'packed' ELSE status END,
              updated_at = ? WHERE id = ?`,
      params: [booked.courierOrderId, booked.shipmentId, booked.awb, booked.courier, booked.labelUrl, booked.trackingUrl, now, now, orderId],
    },
    {
      sql: 'INSERT INTO order_events (order_id, status, note, created_at) VALUES (?, ?, ?, ?)',
      params: [orderId, moveToPacked ? 'packed' : 'courier', `Shipment booked with ${booked.courier} · AWB ${booked.awb}`, now],
    },
  ])
  const updated = await db.first('SELECT * FROM orders WHERE id = ?', [orderId])
  if (moveToPacked) await notify(svc, updated, 'packed')
  return updated
}

// Apply a courier status (from the webhook or polling). Moves the order
// forward only — never backwards, never out of cancelled — emails the
// customer on each change, and logs the courier's status for the team.
export async function applyCourierStatus(svc, order, statusText, at = Date.now()) {
  const { db } = svc
  const text = String(statusText ?? '').trim().toUpperCase().slice(0, 80)
  const now = Date.now()
  if (!text || !IN_FLIGHT.includes(order.status)) {
    await db.run('UPDATE orders SET tracking_checked_at = ? WHERE id = ?', [now, order.id])
    return { changed: false }
  }
  if (text === order.tracking_status) {
    await db.run('UPDATE orders SET tracking_checked_at = ? WHERE id = ?', [now, order.id])
    return { changed: false }
  }

  const target = mapCourierStatus(text)
  const forward = target && FULFILMENT_STATUSES.indexOf(target) > FULFILMENT_STATUSES.indexOf(order.status)
  if (forward) {
    // Guard on the status we read, so a webhook and the poller can't both apply it
    const res = await db.run(
      'UPDATE orders SET status = ?, tracking_status = ?, tracking_checked_at = ?, updated_at = ? WHERE id = ? AND status = ?',
      [target, text, now, now, order.id, order.status],
    )
    if (!res.changes) return { changed: false }
    await db.run('INSERT INTO order_events (order_id, status, note, created_at) VALUES (?, ?, ?, ?)', [order.id, target, `Courier: ${text}`, at])
    await notify(svc, { ...order, status: target }, target)
    return { changed: true, status: target }
  }

  // No status change: keep the courier's log (problems are flagged for the team)
  await db.batch([
    { sql: 'UPDATE orders SET tracking_status = ?, tracking_checked_at = ? WHERE id = ?', params: [text, now, order.id] },
    {
      sql: 'INSERT INTO order_events (order_id, status, note, created_at) VALUES (?, ?, ?, ?)',
      params: [order.id, isCourierProblem(text) ? 'courier_issue' : 'courier', `Courier: ${text}`, at],
    },
  ])
  return { changed: false }
}

// Backstop for missed webhooks (maintenance job): re-check booked
// shipments that haven't been updated for a while.
export async function syncShipments(svc, now = Date.now()) {
  const { db, courier } = svc
  if (!courier) return 0
  const every = courier.name === 'fake' ? 0 : POLL_EVERY_MS
  const due = await db.all(
    `SELECT * FROM orders WHERE courier_provider = ? AND status IN ('packed', 'shipped', 'out_for_delivery')
       AND tracking_number IS NOT NULL AND IFNULL(tracking_checked_at, 0) <= ? ORDER BY tracking_checked_at LIMIT 25`,
    [courier.name, now - every],
  )
  let changed = 0
  for (const o of due) {
    try {
      const t = await courier.track(o.tracking_number, now)
      if (t && (await applyCourierStatus(svc, o, t.status, t.at)).changed) changed++
      else if (!t) await db.run('UPDATE orders SET tracking_checked_at = ? WHERE id = ?', [now, o.id])
    } catch (err) {
      console.error('tracking sync failed', o.id, err)
    }
  }
  return changed
}

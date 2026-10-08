import { Hono } from 'hono'
import { badRequest, unauthorized } from '../lib/errors.js'
import { markOrderPaid, markOrderPaymentFailed } from '../services/orders.js'
import { applyCourierStatus } from '../services/shipments.js'

export const webhooks = new Hono()

// POST /webhooks/razorpay — configure in Razorpay Dashboard → Webhooks
// with events: payment.captured, payment.failed, order.paid. Verified with
// RAZORPAY_WEBHOOK_SECRET over the raw body. Idempotent via
// payment_events (Razorpay retries deliveries).
webhooks.post('/razorpay', async (c) => {
  const svc = c.var.svc
  const raw = await c.req.text()
  const ok = await svc.payments.verifyWebhook(raw, c.req.header('x-razorpay-signature'))
  if (!ok) throw unauthorized('Invalid webhook signature.')

  let event
  try {
    event = JSON.parse(raw)
  } catch {
    throw badRequest('Invalid JSON.')
  }
  const eventId = c.req.header('x-razorpay-event-id') ?? `${event.event}:${event.payload?.payment?.entity?.id ?? event.created_at}`
  const payment = event.payload?.payment?.entity
  const refund = event.payload?.refund?.entity
  const providerOrderId = payment?.order_id ?? event.payload?.order?.entity?.id
  // Refund events identify the order through the refunded payment
  const order = providerOrderId
    ? await svc.db.first('SELECT * FROM orders WHERE payment_order_id = ?', [providerOrderId])
    : refund?.payment_id
      ? await svc.db.first('SELECT * FROM orders WHERE payment_id = ?', [refund.payment_id])
      : null

  const inserted = await svc.db.run(
    'INSERT INTO payment_events (id, provider, type, order_id, payload, created_at) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO NOTHING',
    [eventId, 'razorpay', event.event ?? 'unknown', order?.id, raw, Date.now()],
  )
  if (inserted.changes === 0) return c.json({ ok: true, duplicate: true })
  if (!order) return c.json({ ok: true, ignored: 'unknown order' })

  switch (event.event) {
    case 'payment.captured':
    case 'order.paid': {
      const amount = payment?.amount ?? event.payload?.order?.entity?.amount_paid
      if (amount !== order.total_paise) {
        console.error('Razorpay amount mismatch', { order: order.id, amount, expected: order.total_paise })
        return c.json({ ok: true, ignored: 'amount mismatch' })
      }
      await markOrderPaid(svc, order.id, payment?.id ?? null)
      break
    }
    case 'payment.failed':
      await markOrderPaymentFailed(svc, order.id, payment?.error_description ?? 'Payment failed')
      break
    case 'refund.processed':
      await svc.db.run("INSERT INTO order_events (order_id, status, note, created_at) VALUES (?, 'refund_processed', ?, ?)", [
        order.id,
        `Refund ${refund?.id ?? ''} completed by Razorpay`,
        Date.now(),
      ])
      break
    case 'refund.failed': {
      // Put the order back into "refunds needed" so the team follows up
      const now = Date.now()
      await svc.db.batch([
        { sql: 'UPDATE orders SET refunded_at = NULL, refund_note = ?, updated_at = ? WHERE id = ?', params: [`failed: ${refund?.id ?? 'refund'}`, now, order.id] },
        { sql: "INSERT INTO order_events (order_id, status, note, created_at) VALUES (?, 'refund_failed', ?, ?)", params: [order.id, `Refund ${refund?.id ?? ''} failed — refund again or contact the customer`, now] },
      ])
      break
    }
  }
  return c.json({ ok: true })
})

// POST /webhooks/courier — Shiprocket → Settings → API → Webhooks: set the
// URL to https://api.circuitbay.in/api/webhooks/courier (Shiprocket refuses
// URLs containing its own name) and the token to SHIPROCKET_WEBHOOK_TOKEN.
// Always answers 200 once authenticated, so Shiprocket doesn't retry
// updates for orders we don't know.
webhooks.post('/courier', async (c) => {
  const svc = c.var.svc
  if (!svc.courier) throw badRequest('No courier is connected.')
  if (!svc.courier.verifyWebhook(c)) throw unauthorized('Invalid webhook token.')
  let event
  try {
    event = await c.req.json()
  } catch {
    throw badRequest('Invalid JSON.')
  }
  const awb = event.awb != null ? String(event.awb) : null
  const order =
    (awb && (await svc.db.first('SELECT * FROM orders WHERE tracking_number = ? AND courier_provider = ?', [awb, svc.courier.name]))) ||
    (event.order_id && (await svc.db.first('SELECT * FROM orders WHERE id = ? AND courier_provider = ?', [String(event.order_id), svc.courier.name])))
  if (!order) return c.json({ ok: true, ignored: 'unknown shipment' })
  const at = Date.parse(event.current_timestamp ?? '') || Date.now()
  const result = await applyCourierStatus(svc, order, event.current_status ?? event.shipment_status, at)
  return c.json({ ok: true, ...result })
})

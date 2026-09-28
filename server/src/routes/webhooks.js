import { Hono } from 'hono'
import { badRequest, unauthorized } from '../lib/errors.js'
import { markOrderPaid, markOrderPaymentFailed } from '../services/orders.js'

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
  const providerOrderId = payment?.order_id ?? event.payload?.order?.entity?.id
  const order = providerOrderId ? await svc.db.first('SELECT * FROM orders WHERE payment_order_id = ?', [providerOrderId]) : null

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
  }
  return c.json({ ok: true })
})

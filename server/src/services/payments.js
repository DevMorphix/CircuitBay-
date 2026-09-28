import { hmacSha256Hex, randomId, timingSafeEqual } from '../lib/crypto.js'

// Payment provider interface:
//   name
//   publicKey                                  -> sent to the browser for Checkout.js
//   createOrder({ amountPaise, receipt, notes }) -> { id, amount, currency }
//   verifyPayment({ orderId, paymentId, signature }) -> boolean
//   verifyWebhook(rawBody, signatureHeader)      -> boolean
export function createPaymentProvider(config) {
  return config.PAYMENTS_PROVIDER === 'razorpay' ? razorpay(config) : fake()
}

// Razorpay Standard Checkout:
//  1. server creates an order (Orders API)
//  2. browser opens Checkout.js with { key, order_id, amount }
//  3. browser posts back razorpay_payment_id / order_id / signature
//  4. server verifies HMAC_SHA256(order_id + "|" + payment_id, key_secret)
//  Webhooks (payment.captured / payment.failed / order.paid) are verified
//  with HMAC_SHA256(rawBody, webhook_secret) and act as the backstop if the
//  browser never returns.
function razorpay(config) {
  const auth = `Basic ${btoa(`${config.RAZORPAY_KEY_ID}:${config.RAZORPAY_KEY_SECRET}`)}`
  return {
    name: 'razorpay',
    publicKey: config.RAZORPAY_KEY_ID,
    async createOrder({ amountPaise, receipt, notes }) {
      const res = await fetch('https://api.razorpay.com/v1/orders', {
        method: 'POST',
        headers: { Authorization: auth, 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: amountPaise, currency: 'INR', receipt, notes }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(`Razorpay order failed: ${body?.error?.description ?? res.status}`)
      return { id: body.id, amount: body.amount, currency: body.currency }
    },
    async verifyPayment({ orderId, paymentId, signature }) {
      const expected = await hmacSha256Hex(config.RAZORPAY_KEY_SECRET, `${orderId}|${paymentId}`)
      return timingSafeEqual(expected, signature)
    },
    async verifyWebhook(rawBody, signature) {
      if (!signature) return false
      const expected = await hmacSha256Hex(config.RAZORPAY_WEBHOOK_SECRET, rawBody)
      return timingSafeEqual(expected, signature)
    },
  }
}

// Development stand-in: orders are created locally and any payment whose
// signature is the literal string "fake-ok" is accepted. Refused in
// production by config validation.
function fake() {
  return {
    name: 'fake',
    publicKey: 'fake_key',
    async createOrder({ amountPaise }) {
      return { id: randomId(14, 'fake_order_'), amount: amountPaise, currency: 'INR' }
    },
    async verifyPayment({ signature }) {
      return signature === 'fake-ok'
    },
    async verifyWebhook(_raw, signature) {
      return signature === 'fake-ok'
    },
  }
}

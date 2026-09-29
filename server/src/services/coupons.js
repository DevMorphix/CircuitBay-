import { badRequest } from '../lib/errors.js'

export const normaliseCode = (code) => code.trim().toUpperCase()

const rupees = (paise) => `₹${(paise / 100).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`

// The coupon row if `code` can be used on this cart; otherwise a 400 with a
// field error on `couponCode` saying why (shown next to the coupon box).
// The per-customer limit counts that email's paid orders; the overall limit
// is enforced atomically when the checkout reserves a use.
export async function usableCoupon(db, code, { subtotalPaise, email, now = Date.now() }) {
  const fail = (message) => badRequest(message, [{ path: 'couponCode', message }])
  const c = await db.first('SELECT * FROM coupons WHERE code = ?', [normaliseCode(code)])
  if (!c || !c.active) throw fail(`"${normaliseCode(code)}" isn't a valid coupon code.`)
  if (c.starts_at && now < c.starts_at) throw fail(`${c.code} isn't active yet.`)
  if (c.ends_at && now > c.ends_at) throw fail(`${c.code} has expired.`)
  if (c.max_uses != null && c.used_count >= c.max_uses) throw fail(`${c.code} has been fully used.`)
  if (subtotalPaise < c.min_subtotal_paise) throw fail(`${c.code} needs ${rupees(c.min_subtotal_paise)} of items or more (before GST).`)
  if (email && c.per_customer != null) {
    const { n } = await db.first(
      `SELECT COUNT(*) AS n FROM orders
        WHERE coupon_code = ? AND contact_email = ? AND status NOT IN ('cancelled', 'pending_payment', 'payment_failed')`,
      [c.code, email],
    )
    if (n >= c.per_customer) throw fail(c.per_customer === 1 ? `You've already used ${c.code}.` : `You've used ${c.code} the maximum number of times.`)
  }
  return c
}

export const isCouponConflict = (err) => /coupon_uses/i.test(String(err?.message ?? err))

// Short customer-facing summary, e.g. "10% off (up to ₹500)"
export function describeCoupon(c) {
  if (c.kind === 'percent') return `${c.value}% off${c.max_discount_paise ? ` (up to ${rupees(c.max_discount_paise)})` : ''}`
  if (c.kind === 'amount') return `${rupees(c.value)} off`
  return 'Free shipping'
}

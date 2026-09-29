import { useState } from 'react'
import { formatPrice } from '../../content/shopData.js'
import { summarise } from '../../context/CartContext.jsx'

// Order summary used on cart + checkout (Part C5/C6).
// `serverTotals` (from POST /api/checkout) replaces the estimate once known.
export function OrderSummary({ items, subtotal, shippingMethod = 'standard', serverTotals, showItems = false, showCoupon = true, children }) {
  const [code, setCode] = useState('')
  const [couponMsg, setCouponMsg] = useState('')
  const { shipping, tax, total } = serverTotals ?? summarise(items, shippingMethod)

  return (
    <aside className="card p-6" aria-label="Order summary">
      <h2 className="font-heading text-lg font-semibold text-ink-900">Order summary</h2>

      {showItems && (
        <ul className="mt-4 space-y-3 border-b border-black/5 pb-4">
          {items.map((l) => (
            <li key={l.id} className="flex justify-between gap-3 text-sm">
              <span className="text-ink-600">
                {l.product.name} <span className="text-ink-400">× {l.qty}</span>
              </span>
              <span className="font-medium text-ink-900">{formatPrice(l.product.price * l.qty)}</span>
            </li>
          ))}
        </ul>
      )}

      <dl className="mt-4 space-y-2.5 text-sm">
        <Row label="Subtotal" value={formatPrice(subtotal)} />
        <Row label="Shipping" value={shipping === 0 ? 'Free' : formatPrice(shipping)} />
        <Row label="GST" value={formatPrice(tax)} />
      </dl>

      {showCoupon && (
        <form
          className="mt-4 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            // TODO_CLIENT: real coupon validation
            setCouponMsg(code ? `"${code}" isn't a valid code yet.` : '')
          }}
        >
          <label htmlFor="coupon" className="sr-only">
            Coupon code
          </label>
          <input id="coupon" value={code} onChange={(e) => setCode(e.target.value)} placeholder="Coupon code" className="field py-2!" />
          <button type="submit" className="rounded-xl border border-brand-500/50 px-4 text-sm font-semibold text-brand-600 hover:bg-brand-500/5">
            Apply
          </button>
        </form>
      )}
      {couponMsg && <p className="mt-2 text-xs text-ink-400">{couponMsg}</p>}

      <div className="mt-4 flex items-baseline justify-between border-t border-black/5 pt-4">
        <span className="font-semibold text-ink-900">Total</span>
        <span className="font-heading text-2xl font-semibold text-ink-900">{formatPrice(total)}</span>
      </div>
      {children && <div className="mt-6 flex flex-col gap-3">{children}</div>}
    </aside>
  )
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between">
      <dt className="text-ink-600">{label}</dt>
      <dd className="font-medium text-ink-900">{value}</dd>
    </div>
  )
}

import { useEffect, useState } from 'react'
import { formatPrice } from '../../content/shopData.js'
import { summarise, useCart } from '../../context/CartContext.jsx'
import { api, fieldErrors } from '../../lib/api.js'

const quoteKey = (items, shippingMethod, coupon) => `${coupon}|${shippingMethod}|${items.map((l) => `${l.id}:${l.qty}`).join(',')}`

// Order summary used on cart + checkout (Part C5/C6).
// Totals: `serverTotals` (from POST /api/checkout) once the order exists;
// before that, a server quote while a coupon is applied; otherwise a local
// estimate that mirrors the server's pricing.
export function OrderSummary({ items, subtotal, shippingMethod = 'standard', serverTotals, email, showItems = false, showCoupon = true, children }) {
  const { coupon, setCoupon } = useCart()
  const [code, setCode] = useState('')
  const [couponMsg, setCouponMsg] = useState('')
  const [applying, setApplying] = useState(false)
  const [quote, setQuote] = useState(null) // { key, totals }

  const key = quoteKey(items, shippingMethod, coupon)
  const quoteBody = (couponCode) => ({
    items: items.map((l) => ({ productId: l.id, qty: l.qty })),
    shippingMethod,
    couponCode,
    email: email || undefined,
  })

  // Re-price with the coupon whenever the cart or shipping changes. If the
  // coupon stops applying (e.g. the cart drops below its minimum), drop it
  // and say why.
  useEffect(() => {
    if (!coupon || serverTotals || items.length === 0 || quote?.key === key) return
    let cancelled = false
    api
      .post('/checkout/quote', quoteBody(coupon))
      .then((r) => !cancelled && setQuote({ key, totals: r.totals }))
      .catch((err) => {
        if (cancelled) return
        if (fieldErrors(err).couponCode) {
          setCoupon('')
          setCouponMsg(err.message)
        }
      })
    return () => {
      cancelled = true
    }
    // quoteBody is rebuilt every render from the same inputs as `key`
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, coupon, serverTotals, items.length, quote?.key, setCoupon])

  async function apply(e) {
    e.preventDefault()
    const typed = code.trim().toUpperCase()
    if (!typed) return
    setApplying(true)
    setCouponMsg('')
    try {
      const r = await api.post('/checkout/quote', quoteBody(typed))
      setQuote({ key: quoteKey(items, shippingMethod, r.totals.coupon.code), totals: r.totals })
      setCoupon(r.totals.coupon.code)
      setCode('')
    } catch (err) {
      setCouponMsg(fieldErrors(err).couponCode ?? err.message)
    } finally {
      setApplying(false)
    }
  }

  const quoted = coupon && quote?.key === key ? quote.totals : null
  const totals = serverTotals ?? quoted ?? summarise(items, shippingMethod)
  const applied = serverTotals?.coupon ?? quoted?.coupon ?? null

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
        <Row label="Subtotal" value={formatPrice(totals.subtotal ?? subtotal)} />
        {totals.discount > 0 && <Row label={`Coupon ${applied?.code ?? ''}`} value={`−${formatPrice(totals.discount)}`} />}
        <Row label="Shipping" value={totals.shipping === 0 ? 'Free' : formatPrice(totals.shipping)} />
        <Row label="GST" value={formatPrice(totals.tax)} />
      </dl>

      {coupon && !serverTotals && showCoupon && (
        <div className="mt-4 flex items-center justify-between gap-3 rounded-xl bg-brand-500/5 px-3 py-2 text-sm">
          <span className="text-ink-600">
            <strong className="text-ink-900">{coupon}</strong>
            {applied?.summary ? ` · ${applied.summary}` : ' · checking…'}
          </span>
          <button
            type="button"
            onClick={() => {
              setCoupon('')
              setCouponMsg('')
            }}
            className="shrink-0 font-semibold text-brand-700 hover:underline"
          >
            Remove
          </button>
        </div>
      )}

      {showCoupon && !coupon && !serverTotals && (
        <form className="mt-4 flex gap-2" onSubmit={apply}>
          <label htmlFor="coupon" className="sr-only">
            Coupon code
          </label>
          <input
            id="coupon"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Coupon code"
            autoCapitalize="characters"
            maxLength={40}
            aria-describedby={couponMsg ? 'coupon-msg' : undefined}
            className="field py-2!"
          />
          <button type="submit" disabled={applying} className="rounded-xl border border-brand-500/50 px-4 text-sm font-semibold text-brand-600 hover:bg-brand-500/5 disabled:opacity-60">
            {applying ? '…' : 'Apply'}
          </button>
        </form>
      )}
      {couponMsg && (
        <p id="coupon-msg" role="status" className="mt-2 text-xs font-medium text-navy-800">
          {couponMsg}
        </p>
      )}

      <div className="mt-4 flex items-baseline justify-between border-t border-black/5 pt-4">
        <span className="font-semibold text-ink-900">Total</span>
        <span className="font-heading text-2xl font-semibold text-ink-900">{formatPrice(totals.total)}</span>
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

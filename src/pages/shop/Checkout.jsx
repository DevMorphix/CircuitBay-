import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { PageShell } from '../../components/layout/PageShell.jsx'
import { PageHero, Section } from '../../components/ui/Section.jsx'
import { Button } from '../../components/ui/Button.jsx'
import { Icon } from '../../components/ui/Icon.jsx'
import { OrderSummary } from '../../components/shop/OrderSummary.jsx'
import { formatPrice, paymentMethods } from '../../content/shopData.js'
import { useCart } from '../../context/CartContext.jsx'
import { useAuth } from '../../context/AuthContext.jsx'
import { api, fieldErrors } from '../../lib/api.js'
import { payWithRazorpay } from '../../lib/razorpay.js'
import { trackEvent } from '../../lib/analytics.js'

const STEPS = ['Contact & address', 'Shipping', 'Payment']
// Keep in sync with server/src/lib/money.js (the server's totals are final)
const SHIPPING = [
  { id: 'standard', label: 'Standard delivery', eta: '3–7 working days', note: '₹79 · free over ₹999' },
  { id: 'express', label: 'Express delivery', eta: '1–3 working days', note: '₹149' },
]

// C6 — single page, 3 steps, persistent order summary.
// Flow: POST /api/checkout (server prices the cart and reserves stock for
// 30 min) → Razorpay payment window → POST /api/checkout/verify.
export function Checkout() {
  const { items, subtotal, clear } = useCart()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [form, setForm] = useState(() => ({
    name: user?.name ?? '',
    phone: user?.phone?.replace(/^\+91/, '') ?? '',
    email: user?.email ?? '',
    line1: '',
    line2: '',
    city: '',
    state: '',
    pin: '',
  }))
  const [shipping, setShipping] = useState('standard')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null) // { message, items?: [], fields?: {} }
  const [pending, setPending] = useState(null) // server order awaiting payment (for retries)
  const [done, setDone] = useState(false)

  if (items.length === 0 && !done) return <Navigate to="/shop/cart" replace />

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))
  const next = (e) => {
    e.preventDefault()
    setError(null)
    setStep((s) => s + 1)
  }

  // Create the order once; retries reuse it while the stock hold lasts
  async function createOrder() {
    const res = await api.post('/checkout', {
      items: items.map((l) => ({ productId: l.id, qty: l.qty })),
      contact: { name: form.name, email: form.email, phone: form.phone },
      address: { line1: form.line1, line2: form.line2 || undefined, city: form.city, state: form.state, pin: form.pin },
      shippingMethod: shipping,
    })
    setPending(res)
    return res
  }

  async function pay(e) {
    e.preventDefault()
    setError(null)
    setBusy(true)
    let order = pending
    try {
      order ??= await createOrder()
      const result =
        order.payment.provider === 'fake'
          ? // Local development only — the API refuses fake payments in production
            { razorpay_order_id: order.payment.orderId, razorpay_payment_id: `pay_dev_${Date.now()}`, razorpay_signature: 'fake-ok' }
          : await payWithRazorpay(order.payment)
      const verified = await api.post('/checkout/verify', { orderId: order.orderId, ...result })
      trackEvent('purchase', { transaction_id: order.orderId, value: order.totals.total, currency: 'INR' })
      setDone(true)
      clear()
      navigate(`/shop/order/${order.orderId}`, { state: { order: verified.order } })
    } catch (err) {
      if (err?.dismissed) {
        setError({ message: 'Payment window closed. Your items are held for 30 minutes — you can try again.' })
      } else if (err?.failed) {
        api.post('/checkout/failed', { orderId: order.orderId, reason: err.reason }).catch(() => {})
        setError({ message: `Payment failed${err.reason ? `: ${err.reason}` : ''}. No money was taken — please try again or use another method.` })
      } else if (err?.status === 409) {
        setPending(null)
        setError({ message: err.message, items: err.details ?? [] })
      } else if (err?.status === 400 && !order) {
        setStep(0)
        setError({ message: err.message, fields: fieldErrors(err) })
      } else {
        setError({ message: err?.message ?? 'Something went wrong. Please try again.' })
      }
    } finally {
      setBusy(false)
    }
  }

  const fe = error?.fields ?? {}
  const serverTotals = pending?.totals

  return (
    <PageShell shop seo={{ title: 'Checkout', path: '/shop/checkout', noindex: true }}>
      <PageHero compact title="Checkout" />

      <Section tone="soft" className="pt-10!">
        <ol className="mb-8 flex items-center gap-2 sm:gap-4" aria-label="Checkout steps">
          {STEPS.map((s, i) => (
            <li key={s} className="flex flex-1 items-center gap-2 sm:gap-3">
              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${
                  i <= step ? 'node-lit text-white' : 'bg-white text-ink-400 shadow-sm'
                }`}
                aria-current={i === step ? 'step' : undefined}
              >
                {i < step ? <Icon name="check" size={16} /> : i + 1}
              </span>
              <span className={`hidden text-sm font-semibold sm:inline ${i <= step ? 'text-ink-900' : 'text-ink-400'}`}>{s}</span>
              {i < STEPS.length - 1 && <span className={`h-0.5 flex-1 ${i < step ? 'bg-brand-600' : 'bg-black/10'}`} />}
            </li>
          ))}
        </ol>

        {error && (
          <div role="alert" className="mb-6 rounded-xl border border-navy-800/20 bg-white p-4 text-sm text-ink-900 shadow-sm">
            <p className="font-semibold">{error.message}</p>
            {error.items?.length > 0 && (
              <ul className="mt-2 list-disc pl-5 text-ink-600">
                {error.items.map((i) => (
                  <li key={i.productId}>{i.message}</li>
                ))}
              </ul>
            )}
            {error.items?.length > 0 && (
              <Link to="/shop/cart" className="mt-3 inline-block font-semibold text-brand-700">
                Update your cart →
              </Link>
            )}
          </div>
        )}

        <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
          <div className="space-y-4">
            <StepCard index={0} step={step} title={STEPS[0]} onEdit={() => !pending && setStep(0)}>
              <form onSubmit={next} className="grid gap-4 sm:grid-cols-2">
                <In label="Full name" id="name" autoComplete="name" value={form.name} onChange={set('name')} error={fe['contact.name']} />
                <In label="Mobile number" id="phone" type="tel" autoComplete="tel" value={form.phone} onChange={set('phone')} error={fe['contact.phone']} />
                <In label="Email" id="email" type="email" autoComplete="email" className="sm:col-span-2" value={form.email} onChange={set('email')} error={fe['contact.email']} />
                <In label="Address" id="line1" autoComplete="address-line1" className="sm:col-span-2" value={form.line1} onChange={set('line1')} error={fe['address.line1']} />
                <In label="Apartment, landmark (optional)" id="line2" autoComplete="address-line2" required={false} className="sm:col-span-2" value={form.line2} onChange={set('line2')} />
                <In label="City" id="city" autoComplete="address-level2" value={form.city} onChange={set('city')} error={fe['address.city']} />
                <In label="PIN code" id="pin" inputMode="numeric" pattern="[0-9]{6}" autoComplete="postal-code" value={form.pin} onChange={set('pin')} error={fe['address.pin']} />
                <In label="State" id="state" autoComplete="address-level1" className="sm:col-span-2" value={form.state} onChange={set('state')} error={fe['address.state']} />
                <div className="sm:col-span-2">
                  <Button type="submit">Continue to shipping</Button>
                </div>
              </form>
            </StepCard>

            <StepCard index={1} step={step} title={STEPS[1]} onEdit={() => !pending && setStep(1)}>
              <form onSubmit={next} className="space-y-3">
                {SHIPPING.map((o) => (
                  <Radio key={o.id} name="shipping" checked={shipping === o.id} onChange={() => setShipping(o.id)} label={o.label} hint={`${o.eta} · ${o.note}`} />
                ))}
                <Button type="submit" className="mt-3">
                  Continue to payment
                </Button>
              </form>
            </StepCard>

            <StepCard index={2} step={step} title={STEPS[2]}>
              <form onSubmit={pay} className="space-y-4">
                <p className="text-sm text-ink-600">You'll choose how to pay in Razorpay's secure payment window:</p>
                <ul className="grid gap-2 sm:grid-cols-2">
                  {paymentMethods.map((m) => (
                    <li key={m.id} className="rounded-xl border border-black/10 p-3">
                      <span className="block text-sm font-semibold text-ink-900">{m.label}</span>
                      <span className="block text-xs text-ink-400">{m.hint}</span>
                    </li>
                  ))}
                </ul>
                <p className="flex items-center gap-2 text-sm text-ink-600">
                  <Icon name="shield" size={18} className="text-brand-500" />
                  Payments are processed securely by Razorpay. We never see or store your card details.
                </p>
                <Button type="submit" className="w-full sm:w-auto" disabled={busy}>
                  {busy ? 'Opening payment…' : serverTotals ? `Pay ${formatPrice(serverTotals.total)}` : 'Pay securely'}
                </Button>
              </form>
            </StepCard>
          </div>

          <div className="lg:sticky lg:top-40 lg:self-start">
            <OrderSummary items={items} subtotal={subtotal} shippingMethod={shipping} serverTotals={serverTotals} showItems showCoupon={false} />
          </div>
        </div>
      </Section>
    </PageShell>
  )
}

function StepCard({ index, step, title, onEdit, children }) {
  const open = index === step
  const done = index < step
  return (
    <section className="card p-6" aria-label={title}>
      <div className="flex items-center justify-between">
        <h2 className={`font-heading text-lg font-semibold ${open || done ? 'text-ink-900' : 'text-ink-400'}`}>
          {index + 1}. {title}
        </h2>
        {done && onEdit && (
          <button type="button" onClick={onEdit} className="text-sm font-semibold text-brand-700">
            Edit
          </button>
        )}
      </div>
      {open && <div className="mt-5">{children}</div>}
    </section>
  )
}

function In({ label, id, className = '', error, required = true, ...rest }) {
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-ink-900">
        {label}
      </label>
      <input id={id} required={required} aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-err` : undefined} className="field" {...rest} />
      {error && (
        <p id={`${id}-err`} className="mt-1 text-xs font-medium text-navy-800">
          {error}
        </p>
      )}
    </div>
  )
}

function Radio({ name, checked, onChange, label, hint }) {
  return (
    <label
      className={`flex cursor-pointer items-center gap-3 rounded-xl border p-4 transition-colors ${
        checked ? 'border-brand-600 bg-brand-500/5' : 'border-black/10 hover:border-brand-500/40'
      }`}
    >
      <input type="radio" name={name} checked={checked} onChange={onChange} className="h-4 w-4 accent-brand-600" />
      <span>
        <span className="block text-sm font-semibold text-ink-900">{label}</span>
        <span className="block text-xs text-ink-400">{hint}</span>
      </span>
    </label>
  )
}

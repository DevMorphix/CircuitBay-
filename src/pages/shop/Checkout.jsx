import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { PageShell } from '../../components/layout/PageShell.jsx'
import { PageHero, Section } from '../../components/ui/Section.jsx'
import { Button } from '../../components/ui/Button.jsx'
import { Icon } from '../../components/ui/Icon.jsx'
import { OrderSummary } from '../../components/shop/OrderSummary.jsx'
import { paymentMethods } from '../../content/shopData.js'
import { summarise, useCart } from '../../context/CartContext.jsx'
import { trackEvent } from '../../lib/analytics.js'

const STEPS = ['Contact & address', 'Shipping', 'Payment']
const SHIPPING = [
  { id: 'standard', label: 'Standard delivery', eta: '3–7 working days', note: 'Free over ₹999' },
  { id: 'express', label: 'Express delivery', eta: '1–3 working days', note: 'TODO_CLIENT: price' },
]

// C6 — single page, 3 steps, persistent order summary.
// TODO_CLIENT: integrate the real payment gateway (Razorpay / Cashfree /
// other). "Pay" currently simulates a successful order.
export function Checkout() {
  const { items, subtotal, clear } = useCart()
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [shipping, setShipping] = useState('standard')
  const [payment, setPayment] = useState('upi')
  const [paying, setPaying] = useState(false)

  if (items.length === 0 && !paying) return <Navigate to="/shop/cart" replace />

  const next = (e) => {
    e.preventDefault()
    setStep((s) => s + 1)
  }

  const pay = (e) => {
    e.preventDefault()
    setPaying(true)
    const orderId = `CB${Date.now().toString().slice(-8)}`
    const { total } = summarise(subtotal)
    trackEvent('purchase', { transaction_id: orderId, value: total, payment_type: payment })
    const order = { id: orderId, items, total, shipping }
    clear()
    navigate(`/shop/order/${orderId}`, { state: { order } })
  }

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
              {i < STEPS.length - 1 && <span className={`h-0.5 flex-1 ${i < step ? 'bg-brand-500' : 'bg-black/10'}`} />}
            </li>
          ))}
        </ol>

        <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
          <div className="space-y-4">
            <StepCard index={0} step={step} title={STEPS[0]} onEdit={() => setStep(0)}>
              <form onSubmit={next} className="grid gap-4 sm:grid-cols-2">
                <In label="Full name" id="name" autoComplete="name" />
                <In label="Phone" id="phone" type="tel" autoComplete="tel" />
                <In label="Email" id="email" type="email" autoComplete="email" className="sm:col-span-2" />
                <In label="Address" id="address" autoComplete="street-address" className="sm:col-span-2" />
                <In label="City" id="city" autoComplete="address-level2" />
                <In label="PIN code" id="pin" inputMode="numeric" pattern="[0-9]{6}" autoComplete="postal-code" />
                <In label="State" id="state" autoComplete="address-level1" className="sm:col-span-2" />
                <div className="sm:col-span-2">
                  <Button type="submit">Continue to shipping</Button>
                </div>
              </form>
            </StepCard>

            <StepCard index={1} step={step} title={STEPS[1]} onEdit={() => setStep(1)}>
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
              <form onSubmit={pay} className="space-y-3">
                {paymentMethods.map((m) => (
                  <Radio key={m.id} name="payment" checked={payment === m.id} onChange={() => setPayment(m.id)} label={m.label} hint={m.hint} />
                ))}
                <p className="flex items-center gap-2 pt-2 text-sm text-ink-600">
                  <Icon name="shield" size={18} className="text-brand-500" />
                  Payments are processed securely. We never store your card details.
                </p>
                <Button type="submit" className="mt-3 w-full sm:w-auto">
                  Pay securely
                </Button>
              </form>
            </StepCard>
          </div>

          <div className="lg:sticky lg:top-40 lg:self-start">
            <OrderSummary items={items} subtotal={subtotal} showItems showCoupon={false} />
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
          <button type="button" onClick={onEdit} className="text-sm font-semibold text-brand-600">
            Edit
          </button>
        )}
      </div>
      {open && <div className="mt-5">{children}</div>}
    </section>
  )
}

function In({ label, id, className = '', ...rest }) {
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-ink-900">
        {label}
      </label>
      <input id={id} required className="field" {...rest} />
    </div>
  )
}

function Radio({ name, checked, onChange, label, hint }) {
  return (
    <label
      className={`flex cursor-pointer items-center gap-3 rounded-xl border p-4 transition-colors ${
        checked ? 'border-brand-500 bg-brand-500/5' : 'border-black/10 hover:border-brand-500/40'
      }`}
    >
      <input type="radio" name={name} checked={checked} onChange={onChange} className="h-4 w-4 accent-brand-500" />
      <span>
        <span className="block text-sm font-semibold text-ink-900">{label}</span>
        <span className="block text-xs text-ink-400">{hint}</span>
      </span>
    </label>
  )
}

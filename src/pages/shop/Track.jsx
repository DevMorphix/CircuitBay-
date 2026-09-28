import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { PageShell } from '../../components/layout/PageShell.jsx'
import { PageHero, Section } from '../../components/ui/Section.jsx'
import { Button } from '../../components/ui/Button.jsx'
import { ArrowLink } from '../../components/ui/Card.jsx'
import { Icon } from '../../components/ui/Icon.jsx'
import { trackingSteps } from '../../content/shopData.js'

// C7 — order ID + phone/email lookup; status timeline styled as circuit
// nodes lighting up. TODO_CLIENT: connect to the real order/courier API —
// the status below is simulated.
export function Track() {
  const [params] = useSearchParams()
  const [orderId, setOrderId] = useState(params.get('order') ?? '')
  const [contact, setContact] = useState('')
  const [result, setResult] = useState(null)

  const lookup = (e) => {
    e.preventDefault()
    // Deterministic mock status from the order ID
    const reached = [...orderId].reduce((n, c) => n + c.charCodeAt(0), 0) % (trackingSteps.length - 1) + 1
    setResult({ id: orderId.trim(), reached })
  }

  return (
    <PageShell shop seo={{ title: 'Track your order', path: '/shop/track', noindex: true }}>
      <PageHero compact eyebrow="ORDER TRACKING" title="Where's my build?" subtitle="Enter your order ID and the phone number or email you ordered with.">
        <form onSubmit={lookup} className="mt-8 grid max-w-2xl gap-3 sm:grid-cols-[1fr_1fr_auto]">
          <label htmlFor="t-order" className="sr-only">Order ID</label>
          <input id="t-order" required value={orderId} onChange={(e) => setOrderId(e.target.value)} placeholder="Order ID, e.g. CB12345678" className="field" />
          <label htmlFor="t-contact" className="sr-only">Phone or email</label>
          <input id="t-contact" required value={contact} onChange={(e) => setContact(e.target.value)} placeholder="Phone or email" className="field" />
          <Button type="submit">Track</Button>
        </form>
      </PageHero>

      <Section tone="soft" width="max-w-3xl">
        {result ? (
          <div className="card p-6 sm:p-8">
            <p className="text-sm text-ink-400">Order</p>
            <p className="font-heading text-2xl font-semibold text-ink-900">#{result.id}</p>
            <ol className="mt-8" aria-label="Order status">
              {trackingSteps.map((s, i) => {
                const lit = i < result.reached
                const current = i === result.reached - 1
                return (
                  <li key={s} className="relative flex gap-4 pb-8 last:pb-0">
                    {i < trackingSteps.length - 1 && (
                      <span
                        aria-hidden="true"
                        className={`absolute left-[11px] top-6 h-full w-0.5 ${i < result.reached - 1 ? 'bg-brand-500 shadow-[0_0_8px_rgba(63,125,222,0.6)]' : 'bg-black/10'}`}
                      />
                    )}
                    <span
                      className={`relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                        lit ? 'node-lit text-white' : 'border-2 border-black/15 bg-white'
                      } ${current ? 'animate-pulse-soft' : ''}`}
                    >
                      {lit && !current && <Icon name="check" size={14} strokeWidth={2.4} />}
                    </span>
                    <div>
                      <p className={`font-semibold ${lit ? 'text-ink-900' : 'text-ink-400'}`}>{s}</p>
                      {current && <p className="text-sm text-brand-600">Current status</p>}
                    </div>
                  </li>
                )
              })}
            </ol>
          </div>
        ) : (
          <p className="text-center text-ink-600">Your order's journey will light up here.</p>
        )}
        <p className="mt-8 text-center text-sm text-ink-600">
          Something wrong? <ArrowLink to="/contact">Contact us</ArrowLink>
        </p>
      </Section>
    </PageShell>
  )
}

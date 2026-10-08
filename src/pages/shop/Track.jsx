import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { PageShell } from '../../components/layout/PageShell.jsx'
import { PageHero, Section } from '../../components/ui/Section.jsx'
import { Button } from '../../components/ui/Button.jsx'
import { ArrowLink } from '../../components/ui/Card.jsx'
import { Icon } from '../../components/ui/Icon.jsx'
import { api } from '../../lib/api.js'
import { useAuth } from '../../context/AuthContext.jsx'
import { InvoiceButton } from '../../components/shop/InvoiceButton.jsx'

const LABELS = {
  placed: 'Placed',
  confirmed: 'Confirmed',
  packed: 'Packed',
  shipped: 'Shipped',
  out_for_delivery: 'Out for delivery',
  delivered: 'Delivered',
}

const when = (ms) => new Date(ms).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })

// C7 — order ID + phone/email lookup (GET /api/orders/track); the status
// timeline is styled as circuit nodes lighting up.
export function Track() {
  const [params] = useSearchParams()
  const { user } = useAuth()
  const [orderId, setOrderId] = useState(params.get('order') ?? '')
  // Signed-in customers don't need to retype the email they ordered with
  const [contact, setContact] = useState(user?.email ?? user?.phone ?? '')
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const lookup = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      const q = new URLSearchParams({ orderId: orderId.trim(), contact: contact.trim() })
      setResult(await api.get(`/orders/track?${q}`))
    } catch (err) {
      setResult(null)
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const order = result?.order
  const steps = result?.steps ?? []
  const reachedIndex = order ? steps.indexOf(order.status) : -1
  const eventFor = (status) => order?.events.filter((ev) => ev.status === status).at(-1)

  return (
    <PageShell shop seo={{ title: 'Track your order', path: '/shop/track', noindex: true }}>
      <PageHero compact eyebrow="ORDER TRACKING" title="Where's my build?" subtitle="Enter your order ID and the phone number or email you ordered with.">
        <form onSubmit={lookup} className="mt-8 grid max-w-2xl gap-3 sm:grid-cols-[1fr_1fr_auto]">
          <label htmlFor="t-order" className="sr-only">Order ID</label>
          <input id="t-order" required value={orderId} onChange={(e) => setOrderId(e.target.value)} placeholder="Order ID, e.g. CB7K2M9QX4" className="field" />
          <label htmlFor="t-contact" className="sr-only">Phone or email</label>
          <input id="t-contact" required value={contact} onChange={(e) => setContact(e.target.value)} placeholder="Phone or email" className="field" />
          <Button type="submit" disabled={busy}>
            {busy ? 'Checking…' : 'Track'}
          </Button>
        </form>
      </PageHero>

      <Section tone="soft" width="max-w-3xl">
        {error && (
          <p role="alert" className="card p-6 text-center text-ink-900">
            {error}
          </p>
        )}
        {order && (
          <div className="card p-6 sm:p-8">
            <p className="text-sm text-ink-400">Order</p>
            <p className="font-heading text-2xl font-semibold text-ink-900">#{order.id}</p>
            {(order.invoiceNo || order.creditNoteNo) && (
              <div className="mt-3 flex flex-wrap gap-2">
                {order.invoiceNo && <InvoiceButton path="/orders/invoice" body={{ orderId: order.id, contact }} label={`GST invoice ${order.invoiceNo}`} />}
                {order.creditNoteNo && <InvoiceButton path="/orders/credit-note" body={{ orderId: order.id, contact }} label={`Credit note ${order.creditNoteNo}`} />}
              </div>
            )}
            {order.trackingNumber && (
              <p className="mt-2 text-sm text-ink-600">
                {order.courier ?? 'Courier'} tracking number: <span className="font-semibold text-ink-900">{order.trackingNumber}</span>
                {order.trackingStatus && order.status !== 'delivered' && (
                  <>
                    {' '}
                    · latest: <span className="font-semibold text-ink-900">{order.trackingStatus.toLowerCase()}</span>
                  </>
                )}
                {order.trackingUrl && order.status !== 'delivered' && (
                  <>
                    {' '}
                    ·{' '}
                    <a href={order.trackingUrl} target="_blank" rel="noopener noreferrer" className="font-semibold text-brand-700">
                      Live courier tracking →
                    </a>
                  </>
                )}
              </p>
            )}

            {reachedIndex === -1 ? (
              // Not in the fulfilment flow: awaiting payment, failed or cancelled
              <p className="mt-6 rounded-xl bg-surface-soft p-4 text-ink-900">
                {order.status === 'cancelled'
                  ? 'This order was cancelled. If you were charged, the refund is on its way — contact us with any questions.'
                  : order.status === 'payment_failed'
                    ? "Payment for this order didn't go through, so nothing will ship."
                    : "We're waiting for payment confirmation for this order."}
              </p>
            ) : (
              <ol className="mt-8" aria-label="Order status">
                {steps.map((s, i) => {
                  const lit = i <= reachedIndex
                  const current = i === reachedIndex
                  const ev = eventFor(s)
                  return (
                    <li key={s} className="relative flex gap-4 pb-8 last:pb-0" aria-current={current ? 'step' : undefined}>
                      {i < steps.length - 1 && (
                        <span
                          aria-hidden="true"
                          className={`absolute left-[11px] top-6 h-full w-0.5 ${i < reachedIndex ? 'bg-brand-600 shadow-[0_0_8px_rgba(63,125,222,0.6)]' : 'bg-black/10'}`}
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
                        <p className={`font-semibold ${lit ? 'text-ink-900' : 'text-ink-400'}`}>{LABELS[s] ?? s}</p>
                        {ev && <p className="text-xs text-ink-400">{when(ev.at)}{ev.note ? ` · ${ev.note}` : ''}</p>}
                        {current && <p className="text-sm text-brand-700">Current status</p>}
                      </div>
                    </li>
                  )
                })}
              </ol>
            )}
          </div>
        )}
        {!order && !error && <p className="text-center text-ink-600">Your order's journey will light up here.</p>}
        <p className="mt-8 text-center text-sm text-ink-600">
          Something wrong? <ArrowLink to="/contact">Contact us</ArrowLink>
        </p>
      </Section>
    </PageShell>
  )
}

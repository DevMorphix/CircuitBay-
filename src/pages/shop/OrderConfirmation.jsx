import { useState } from 'react'
import { useLocation, useParams } from 'react-router-dom'
import { PageShell } from '../../components/layout/PageShell.jsx'
import { Section } from '../../components/ui/Section.jsx'
import { Button } from '../../components/ui/Button.jsx'
import { Icon } from '../../components/ui/Icon.jsx'
import { formatPrice } from '../../content/shopData.js'
import { InvoiceButton } from '../../components/shop/InvoiceButton.jsx'

// C6 confirmation — order number, summary, expected delivery, Track.
// `order` is the verified order returned by POST /api/checkout/verify; on a
// page reload it's gone, so we fall back to the order number + tracking.
export function OrderConfirmation() {
  const { id } = useParams()
  const order = useLocation().state?.order
  const [eta] = useState(() => {
    const days = order?.shippingMethod === 'express' ? 3 : 7
    return new Date(Date.now() + days * 86_400_000).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })
  })

  return (
    <PageShell shop seo={{ title: 'Order confirmed', path: `/shop/order/${id}`, noindex: true }}>
      <section className="section-dark px-4 py-16 text-center sm:px-6 md:py-20">
        <span className="node-lit mx-auto flex h-16 w-16 items-center justify-center rounded-full text-white">
          <Icon name="check" size={30} strokeWidth={2.2} />
        </span>
        <p className="eyebrow mt-8">ORDER CONFIRMED</p>
        <h1 className="mt-3 font-heading text-4xl font-semibold text-white sm:text-5xl">It's on its way to your bench.</h1>
        <p className="mt-4 text-white/70">
          Order <span className="font-semibold text-white">#{id}</span>
          {order && (
            <>
              {' '}· Expected by <span className="font-semibold text-white">{eta}</span>
            </>
          )}
        </p>
        {order && <p className="mt-2 text-sm text-white/60">A confirmation email is on its way to {order.contact.email}.</p>}
      </section>

      <Section tone="soft" width="max-w-2xl">
        {order && (
          <div className="card p-6">
            <h2 className="font-heading text-lg font-semibold text-ink-900">Order summary</h2>
            <ul className="mt-4 divide-y divide-black/5">
              {order.items.map((l) => (
                <li key={l.productId} className="flex justify-between py-3 text-sm">
                  <span className="text-ink-600">
                    {l.name} × {l.qty}
                  </span>
                  <span className="font-medium text-ink-900">{formatPrice(l.unitPrice * l.qty)}</span>
                </li>
              ))}
            </ul>
            <div className="mt-2 flex justify-between border-t border-black/5 pt-4">
              <span className="font-semibold text-ink-900">Total paid</span>
              <span className="font-heading text-xl font-semibold text-ink-900">{formatPrice(order.totals.total)}</span>
            </div>
          </div>
        )}
        <div className="mt-8 flex flex-wrap justify-center gap-4">
          <Button to={`/shop/track?order=${id}`}>Track your order</Button>
          {order?.invoiceNo && <InvoiceButton path="/orders/invoice" body={{ orderId: id, contact: order.contact.email }} label="Download GST invoice" className="py-3!" />}
          <Button to="/shop" variant="secondary">
            Continue shopping
          </Button>
        </div>
      </Section>
    </PageShell>
  )
}

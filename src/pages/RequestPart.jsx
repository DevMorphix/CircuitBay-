import { useState } from 'react'
import { PageShell } from '../components/layout/PageShell.jsx'
import { PageHero, Section } from '../components/ui/Section.jsx'
import { Button } from '../components/ui/Button.jsx'
import { Icon } from '../components/ui/Icon.jsx'
import { FaqList } from '../components/content/FaqList.jsx'
import { requestPart } from '../content/landingData.js'
import { schema } from '../lib/seo.js'
import { trackEvent } from '../lib/analytics.js'

// Component-sourcing landing page. TODO_CLIENT: wire the form to
// POST /api/forms/contact (role + message) once the frontend uses the API.
export function RequestPart() {
  const path = '/request-a-part'
  const [sent, setSent] = useState(false)

  return (
    <PageShell
      shop
      seo={{
        ...requestPart.seo,
        path,
        jsonLd: [
          schema.service({ name: 'Electronic component sourcing', description: requestPart.seo.description, path, serviceType: 'Electronic component sourcing' }),
          schema.faq(requestPart.faq),
          schema.breadcrumbs([{ name: 'Home', path: '/' }, { name: 'Shop', path: '/shop' }, { name: 'Request a part', path }]),
        ],
      }}
    >
      <PageHero compact eyebrow={requestPart.eyebrow} title={requestPart.headline} subtitle={requestPart.subhead} />

      <Section tone="soft">
        <div className="grid gap-10 lg:grid-cols-[1fr_1.3fr]">
          <div>
            <h2 className="font-heading text-2xl font-semibold text-ink-900">How it works</h2>
            <ol className="mt-6 space-y-6">
              {requestPart.steps.map((s, i) => (
                <li key={s.title} className="flex gap-4">
                  <span className="node-lit flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white">{i + 1}</span>
                  <div>
                    <h3 className="font-semibold text-ink-900">{s.title}</h3>
                    <p className="text-sm text-ink-600">{s.body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          <div className="card p-6 sm:p-8">
            {sent ? (
              <p role="status" className="flex items-center gap-3 text-ink-900">
                <Icon name="check" className="text-brand-500" /> Got it — we'll reply with availability and a quote.
              </p>
            ) : (
              <form
                className="grid gap-4 sm:grid-cols-2"
                onSubmit={(e) => {
                  e.preventDefault()
                  trackEvent('form_submit', { form: 'request_part' })
                  setSent(true)
                }}
              >
                <Field id="rp-part" label="Part name or number" required className="sm:col-span-2" placeholder="e.g. INA219 current sensor" />
                <Field id="rp-qty" label="Quantity" type="number" min="1" required defaultValue="1" />
                <Field id="rp-when" label="Needed by (optional)" type="date" />
                <Field id="rp-link" label="Datasheet or product link (optional)" type="url" className="sm:col-span-2" />
                <Field id="rp-email" label="Email" type="email" required />
                <Field id="rp-phone" label="Phone (optional)" type="tel" />
                <div className="sm:col-span-2">
                  <Button type="submit">Request this part →</Button>
                </div>
              </form>
            )}
          </div>
        </div>
      </Section>

      <Section tone="light" eyebrow="QUESTIONS" title="Component sourcing FAQ" width="max-w-3xl">
        <FaqList items={requestPart.faq} />
      </Section>
    </PageShell>
  )
}

function Field({ id, label, className = '', ...rest }) {
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-ink-900">
        {label}
      </label>
      <input id={id} className="field" {...rest} />
    </div>
  )
}

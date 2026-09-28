import { PageShell } from '../components/layout/PageShell.jsx'
import { PageHero, Section } from '../components/ui/Section.jsx'
import { Button } from '../components/ui/Button.jsx'
import { FaqList } from '../components/content/FaqList.jsx'
import { FieldError, FormError, FormSent, Honeypot } from '../components/ui/FormBits.jsx'
import { requestPart } from '../content/landingData.js'
import { schema } from '../lib/seo.js'
import { api } from '../lib/api.js'
import { useSubmit } from '../lib/useSubmit.js'

// Component-sourcing landing page. Requests arrive in the admin inbox as
// contact messages (POST /api/forms/contact) with the part details.
export function RequestPart() {
  const path = '/request-a-part'
  const form = useSubmit('request_part', ({ part, qty, neededBy, link, ...contact }) =>
    api.post('/forms/contact', {
      ...contact,
      message: [`Part request: ${part}`, `Quantity: ${qty}`, neededBy && `Needed by: ${neededBy}`, link && `Link: ${link}`].filter(Boolean).join('\n'),
    }),
  )

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
            {form.sent ? (
              <FormSent>Got it — we'll reply with availability and a quote.</FormSent>
            ) : (
              <form className="relative grid gap-4 sm:grid-cols-2" onSubmit={form.onSubmit}>
                <Honeypot />
                <Field id="rp-part" name="part" label="Part name or number" required className="sm:col-span-2" placeholder="e.g. INA219 current sensor" />
                <Field id="rp-qty" name="qty" label="Quantity" type="number" min="1" required defaultValue="1" />
                <Field id="rp-when" name="neededBy" label="Needed by (optional)" type="date" />
                <Field id="rp-link" name="link" label="Datasheet or product link (optional)" type="url" className="sm:col-span-2" />
                <Field id="rp-name" name="name" label="Your name" required error={form.fields.name} />
                <Field id="rp-email" name="email" label="Email" type="email" required error={form.fields.email} />
                <Field id="rp-phone" name="phone" label="Phone (optional)" type="tel" className="sm:col-span-2" />
                <div className="space-y-3 sm:col-span-2">
                  <FormError message={form.error} />
                  <Button type="submit" disabled={form.sending}>
                    {form.sending ? 'Sending…' : 'Request this part →'}
                  </Button>
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

function Field({ id, label, className = '', error, ...rest }) {
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-ink-900">
        {label}
      </label>
      <input id={id} className="field" aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-err` : undefined} {...rest} />
      <FieldError id={`${id}-err`} message={error} />
    </div>
  )
}

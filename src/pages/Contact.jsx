import { PageShell } from '../components/layout/PageShell.jsx'
import { PageHero, Section } from '../components/ui/Section.jsx'
import { Button } from '../components/ui/Button.jsx'
import { Card } from '../components/ui/Card.jsx'
import { Icon, IconTile } from '../components/ui/Icon.jsx'
import { contact, educators } from '../content/siteContent.js'
import { api } from '../lib/api.js'
import { useSubmit } from '../lib/useSubmit.js'
import { FieldError, FormError, FormSent, Honeypot } from '../components/ui/FormBits.jsx'
import { schema } from '../lib/seo.js'

// D2 — general form with "I am a" dropdown, direct channels, and a separate
// "Request a workshop" form for institutions.
// TODO_CLIENT: wire both forms to a real endpoint (Formspree / CRM / email).
export function Contact() {
  return (
    <PageShell
      seo={{
        title: 'Contact Us — Parts, Projects & School Workshops',
        description: 'Questions about parts, project help or a workshop for your school? Contact CircuitBay by form, email or phone — a real person replies within one working day.',
        path: '/contact',
        jsonLd: [schema.breadcrumbs([{ name: 'Home', path: '/' }, { name: 'Contact', path: '/contact' }])],
      }}
    >
      <PageHero
        eyebrow="CONTACT"
        title="Tell us what you're building."
        subtitle="Parts, projects, workshops or just a question — a real person will reply."
      />

      <Section tone="light">
        <div className="grid gap-10 lg:grid-cols-[1.5fr_1fr]">
          <Card hover={false} className="p-6 sm:p-8">
            <h2 className="font-heading text-2xl font-semibold text-ink-900">Send a message</h2>
            <ContactForm
              name="contact"
              send={(d) => api.post('/forms/contact', d)}
              fields={(fe) => (
                <>
                  <Field label="Name" id="c-name" name="name" required error={fe.name} />
                  <Field label="Email" id="c-email" name="email" type="email" required error={fe.email} />
                  <div>
                    <label htmlFor="c-role" className="mb-1.5 block text-sm font-medium text-ink-900">
                      I am a
                    </label>
                    <select id="c-role" name="role" required defaultValue="" className="field">
                      <option value="" disabled>
                        Choose one
                      </option>
                      {contact.roles.map((r) => (
                        <option key={r}>{r}</option>
                      ))}
                    </select>
                  </div>
                  <Field label="Phone (optional)" id="c-phone" name="phone" type="tel" error={fe.phone} />
                  <Field label="Message" id="c-msg" name="message" textarea required minLength={5} className="sm:col-span-2" error={fe.message} />
                </>
              )}
            />
          </Card>

          <div className="flex flex-col gap-4">
            {contact.channels.map((ch) => {
              const body = (
                <>
                  <IconTile name={ch.icon} />
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-ink-400">{ch.label}</p>
                    <p className="mt-1 font-medium text-ink-900">{ch.value}</p>
                  </div>
                </>
              )
              return ch.href ? (
                <Card key={ch.label} href={ch.href} className="flex items-center gap-4 p-5">
                  {body}
                </Card>
              ) : (
                <Card key={ch.label} hover={false} className="flex items-center gap-4 p-5">
                  {body}
                </Card>
              )
            })}
          </div>
        </div>
      </Section>

      <Section tone="dark" id="workshop">
        <div className="grid gap-10 lg:grid-cols-[1fr_1.4fr]">
          <div>
            <p className="eyebrow mb-4">FOR INSTITUTIONS</p>
            <h2 className="font-heading text-3xl font-semibold text-white sm:text-4xl">Request a workshop</h2>
            <p className="mt-4 text-white/70">{educators.subhead}</p>
            <ul className="mt-8 space-y-3">
              {educators.cards.map((c) => (
                <li key={c.title} className="flex items-center gap-3 text-sm text-white/80">
                  <Icon name="check" size={18} className="text-brand-300" /> {c.title}
                </li>
              ))}
            </ul>
          </div>
          <div className="card card-dark p-6 sm:p-8">
            <ContactForm
              name="workshop"
              dark
              cta="Request a workshop"
              send={(d) => api.post('/forms/workshop-requests', { ...d, studentCount: d.studentCount ? Number(d.studentCount) : undefined })}
              fields={(fe) => (
                <>
                  <Field dark label="Institution name" id="w-inst" name="institution" required error={fe.institution} />
                  <Field dark label="Contact person" id="w-name" name="contactName" required error={fe.contactName} />
                  <Field dark label="Email" id="w-email" name="email" type="email" required error={fe.email} />
                  <Field dark label="Mobile number" id="w-phone" name="phone" type="tel" required error={fe.phone} />
                  <div>
                    <label htmlFor="w-type" className="mb-1.5 block text-sm font-medium text-white">
                      Interested in
                    </label>
                    <select id="w-type" name="interest" className="field" defaultValue={educators.cards[0].title}>
                      {educators.cards.map((c) => (
                        <option key={c.title} className="text-ink-900">
                          {c.title}
                        </option>
                      ))}
                    </select>
                  </div>
                  <Field dark label="Approx. number of students" id="w-count" name="studentCount" type="number" min="1" error={fe.studentCount} />
                  <Field dark label="Anything else?" id="w-msg" name="message" textarea className="sm:col-span-2" error={fe.message} />
                </>
              )}
            />
          </div>
        </div>
      </Section>
    </PageShell>
  )
}

// Posts the form's named fields with `send`; `fields(errors)` renders them
// with any per-field messages from the API.
function ContactForm({ name, send, fields, dark = false, cta = 'Send message' }) {
  const form = useSubmit(name, send)

  if (form.sent) {
    return (
      <div className="mt-6">
        <FormSent dark={dark}>Thanks — we've got it. We'll reply within one working day.</FormSent>
      </div>
    )
  }

  return (
    <form className="relative mt-6 grid gap-5 sm:grid-cols-2" onSubmit={form.onSubmit}>
      <Honeypot />
      {fields(form.fields)}
      <div className="space-y-3 sm:col-span-2">
        <FormError message={form.error} dark={dark} />
        <Button type="submit" disabled={form.sending}>
          {form.sending ? 'Sending…' : `${cta} →`}
        </Button>
      </div>
    </form>
  )
}

function Field({ label, id, textarea = false, dark = false, className = '', error, ...rest }) {
  const describedBy = error ? `${id}-err` : undefined
  return (
    <div className={className}>
      <label htmlFor={id} className={`mb-1.5 block text-sm font-medium ${dark ? 'text-white' : 'text-ink-900'}`}>
        {label}
      </label>
      {textarea ? (
        <textarea id={id} rows={4} className="field" aria-invalid={Boolean(error)} aria-describedby={describedBy} {...rest} />
      ) : (
        <input id={id} className="field" aria-invalid={Boolean(error)} aria-describedby={describedBy} {...rest} />
      )}
      <FieldError id={describedBy} message={error} dark={dark} />
    </div>
  )
}

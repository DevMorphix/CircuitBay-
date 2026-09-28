import { api } from '../../lib/api.js'
import { useSubmit } from '../../lib/useSubmit.js'
import { Honeypot } from './FormBits.jsx'

// Newsletter sign-up → POST /api/forms/newsletter (idempotent per email).
// TODO_CLIENT: sync subscribers to the mailing provider (Resend/Brevo…).
export function NewsletterForm({ className = '', source = 'unknown', cta = 'Subscribe' }) {
  const form = useSubmit(`newsletter_${source}`, (d) => api.post('/forms/newsletter', { ...d, source }))

  if (form.sent) {
    return (
      <p role="status" className={`text-sm font-medium text-brand-300 ${className}`}>
        You're on the list. See you in the bay.
      </p>
    )
  }

  return (
    <form onSubmit={form.onSubmit} className={`relative ${className}`}>
      <Honeypot />
      <div className="flex flex-col gap-2 sm:flex-row">
        <label htmlFor={`newsletter-${source}`} className="sr-only">
          Email address
        </label>
        <input id={`newsletter-${source}`} name="email" type="email" required placeholder="you@email.com" className="field min-w-0 flex-1" />
        <button
          type="submit"
          disabled={form.sending}
          className="rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-700 disabled:opacity-60"
        >
          {form.sending ? 'Subscribing…' : cta}
        </button>
      </div>
      {form.error && (
        <p role="alert" className="mt-2 text-sm text-brand-100">
          {form.error}
        </p>
      )}
    </form>
  )
}

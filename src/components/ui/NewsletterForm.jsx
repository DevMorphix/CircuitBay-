import { useState } from 'react'
import { trackEvent } from '../../lib/analytics.js'

// TODO_CLIENT: wire to the real newsletter provider (Mailchimp / Brevo…).
// Until then it just confirms locally and fires an analytics event.
export function NewsletterForm({ className = '', source = 'unknown', cta = 'Subscribe' }) {
  const [email, setEmail] = useState('')
  const [done, setDone] = useState(false)

  const submit = (e) => {
    e.preventDefault()
    trackEvent('newsletter_signup', { source })
    setDone(true)
  }

  if (done) {
    return (
      <p role="status" className={`text-sm font-medium text-brand-300 ${className}`}>
        You're on the list. See you in the bay.
      </p>
    )
  }

  return (
    <form onSubmit={submit} className={`flex flex-col gap-2 sm:flex-row ${className}`}>
      <label htmlFor={`newsletter-${source}`} className="sr-only">
        Email address
      </label>
      <input
        id={`newsletter-${source}`}
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@email.com"
        className="field min-w-0 flex-1"
      />
      <button
        type="submit"
        className="rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
      >
        {cta}
      </button>
    </form>
  )
}

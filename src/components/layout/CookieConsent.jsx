import { useEffect, useState } from 'react'
import { loadAnalytics } from '../../lib/analytics.js'
import { useHydrated } from '../../lib/hydration.js'

const STORAGE_KEY = 'cb_cookie_consent'

// Storage can throw (private mode / blocked site data) — treat as unset
function readConsent() {
  try {
    return window.localStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}

function saveConsent(value) {
  try {
    window.localStorage.setItem(STORAGE_KEY, value)
  } catch {
    // consent just won't be remembered
  }
}

export function CookieConsent() {
  // Never part of the prerendered HTML: decided in the browser after hydration
  const hydrated = useHydrated()
  const [dismissed, setDismissed] = useState(false)
  const visible = hydrated && !dismissed && !readConsent()

  // Load analytics for visitors who accepted on an earlier visit
  useEffect(() => {
    if (readConsent() === 'accepted') loadAnalytics()
  }, [])

  const accept = () => {
    saveConsent('accepted')
    loadAnalytics()
    setDismissed(true)
  }

  const decline = () => {
    saveConsent('declined')
    setDismissed(true)
  }

  if (!visible) return null

  return (
    <div
      role="dialog"
      aria-label="Cookie consent"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-black/10 bg-white/95 px-6 py-4 shadow-[0_-4px_16px_rgba(0,0,0,0.06)] backdrop-blur"
    >
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 text-sm text-ink-600 sm:flex-row sm:justify-between">
        <p>
          We use cookies for basic analytics to understand how builders use the site. See our{' '}
          <a href="/privacy-policy" className="underline hover:text-brand-600">
            Privacy Policy
          </a>
          .
        </p>
        <div className="flex shrink-0 gap-3">
          <button
            onClick={decline}
            className="rounded-xl border border-ink-900/15 px-4 py-2 text-xs font-semibold text-ink-900 hover:border-ink-900/40"
          >
            Decline
          </button>
          <button
            onClick={accept}
            className="rounded-xl bg-brand-600 px-4 py-2 text-xs font-semibold text-white hover:bg-brand-700"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  )
}

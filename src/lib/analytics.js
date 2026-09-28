// Minimal GA4 loader. Loading is gated behind cookie consent (see
// CookieConsent.jsx) — nothing here fires until the visitor accepts.
//
// TODO_CLIENT: supply the real GA4 Measurement ID.
const GA4_MEASUREMENT_ID = 'G-XXXXXXXXXX'

let loaded = false

export function loadAnalytics() {
  if (loaded || !GA4_MEASUREMENT_ID || GA4_MEASUREMENT_ID.includes('XXXX')) return
  loaded = true

  const script = document.createElement('script')
  script.async = true
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA4_MEASUREMENT_ID}`
  document.head.appendChild(script)

  window.dataLayer = window.dataLayer || []
  function gtag() {
    window.dataLayer.push(arguments)
  }
  window.gtag = gtag
  gtag('js', new Date())
  gtag('config', GA4_MEASUREMENT_ID, { anonymize_ip: true })
}

export function trackEvent(name, params = {}) {
  if (typeof window === 'undefined' || typeof window.gtag !== 'function') return
  window.gtag('event', name, params)
}

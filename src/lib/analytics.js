// Google Analytics 4. Off unless VITE_GA_MEASUREMENT_ID is set (build
// setting), and only loaded after the visitor accepts cookies (see
// CookieConsent.jsx). Page views on client-side navigation are recorded by
// GA4's enhanced measurement (browser history changes).
const GA4_MEASUREMENT_ID = import.meta.env.VITE_GA_MEASUREMENT_ID

let loaded = false

export function loadAnalytics() {
  if (loaded || !GA4_MEASUREMENT_ID) return
  loaded = true

  const script = document.createElement('script')
  script.async = true
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(GA4_MEASUREMENT_ID)}`
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

// ---- GA4 recommended e-commerce events (feed the Monetization reports) ----
const item = (product, quantity = 1) => ({
  item_id: product.id,
  item_name: product.name,
  item_category: product.category,
  price: product.price,
  quantity,
})

export const trackViewItem = (product) => trackEvent('view_item', { currency: 'INR', value: product.price, items: [item(product)] })

export const trackAddToCart = (product, quantity = 1) =>
  trackEvent('add_to_cart', { currency: 'INR', value: product.price * quantity, items: [item(product, quantity)] })

// lines: cart lines ({ product, qty })
export const trackBeginCheckout = (lines, value) =>
  trackEvent('begin_checkout', { currency: 'INR', value, items: lines.map((l) => item(l.product, l.qty)) })

export const trackPurchase = (orderId, totals, lines) =>
  trackEvent('purchase', {
    transaction_id: orderId,
    currency: 'INR',
    value: totals.total,
    tax: totals.tax,
    shipping: totals.shipping,
    items: lines.map((l) => item(l.product, l.qty)),
  })

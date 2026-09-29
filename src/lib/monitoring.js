// Browser error monitoring with Sentry. Off unless VITE_SENTRY_DSN is set.
// The SDK is loaded after the page is up (never slows first paint); errors
// that happen before it's ready are queued and sent once it loads.
// No personal data: default PII is off and query strings (which can hold
// reset tokens or search terms) are stripped from reported URLs.
const DSN = import.meta.env.VITE_SENTRY_DSN

let sentry = null
let queue = []

const stripQuery = (url) => (typeof url === 'string' ? url.split('?')[0].split('#')[0] : url)

export function initMonitoring() {
  if (!DSN || import.meta.env.SSR || typeof window === 'undefined') return

  // Catch early errors until the SDK takes over
  const onError = (e) => queue.push(e.error ?? new Error(String(e.message)))
  const onRejection = (e) => queue.push(e.reason instanceof Error ? e.reason : new Error(String(e.reason)))
  window.addEventListener('error', onError)
  window.addEventListener('unhandledrejection', onRejection)

  const load = () =>
    import('./sentry-lite.js')
      .then((S) => {
        S.init({
          dsn: DSN,
          release: import.meta.env.VITE_RELEASE,
          environment: import.meta.env.MODE,
          sendDefaultPii: false,
          // Errors only (no performance tracing, no session replay)
          defaultIntegrations: false,
          integrations: [S.globalHandlersIntegration(), S.browserApiErrorsIntegration(), S.linkedErrorsIntegration(), S.dedupeIntegration(), S.httpContextIntegration()],
          beforeSend(event) {
            if (event.request?.url) event.request.url = stripQuery(event.request.url)
            delete event.request?.query_string
            delete event.user
            return event
          },
          beforeBreadcrumb(crumb) {
            if (crumb.data?.url) crumb.data.url = stripQuery(crumb.data.url)
            if (crumb.data?.to) crumb.data.to = stripQuery(crumb.data.to)
            if (crumb.data?.from) crumb.data.from = stripQuery(crumb.data.from)
            return crumb
          },
        })
        window.removeEventListener('error', onError)
        window.removeEventListener('unhandledrejection', onRejection)
        sentry = S
        for (const item of queue) {
          if (Array.isArray(item)) S.captureException(item[0], item[1])
          else S.captureException(item)
        }
        queue = []
      })
      .catch(() => {})

  // After the page has loaded and the browser is idle
  if (document.readyState === 'complete') setTimeout(load, 1500)
  else window.addEventListener('load', () => setTimeout(load, 1500), { once: true })
}

// Report a handled error (e.g. from the React error boundary)
export function reportError(error, context = {}) {
  if (!DSN) {
    console.error(error)
    return
  }
  if (sentry) sentry.captureException(error, { extra: context })
  else queue.push([error, { extra: context }])
}

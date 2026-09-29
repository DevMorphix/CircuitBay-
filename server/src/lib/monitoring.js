// Error reporting to Sentry without an SDK (keeps the Worker small): sends a
// standard event envelope over fetch. Off unless SENTRY_DSN is set.
// Only unexpected errors (HTTP 500s, failed cron runs) are reported, with
// no request bodies, cookies or query strings.

const DEDUPE_MS = 60_000

export function createErrorReporter(config, { fetchImpl = (...a) => fetch(...a) } = {}) {
  const dsn = config.SENTRY_DSN
  if (!dsn) return async () => {}

  // DSN: https://<publicKey>@<host>/<projectId>
  const { protocol, username: key, host, pathname } = new URL(dsn)
  const projectId = pathname.replace(/^\//, '')
  const endpoint = `${protocol}//${host}/api/${projectId}/envelope/`
  const recent = new Map() // message → last sent (per isolate)

  return async function report(error, { method, url, tags = {} } = {}) {
    const err = error instanceof Error ? error : new Error(String(error))
    const fingerprint = `${err.name}:${err.message}`
    const now = Date.now()
    if (now - (recent.get(fingerprint) ?? 0) < DEDUPE_MS) return
    recent.set(fingerprint, now)
    if (recent.size > 200) recent.delete(recent.keys().next().value)

    const eventId = crypto.randomUUID().replace(/-/g, '')
    const event = {
      event_id: eventId,
      timestamp: now / 1000,
      platform: 'javascript',
      level: 'error',
      logger: 'circuitbay-api',
      environment: config.APP_ENV,
      release: config.RELEASE,
      tags: { runtime: typeof globalThis.WebSocketPair === 'function' ? 'workers' : 'node', ...tags },
      exception: { values: [{ type: err.name, value: err.message, stacktrace: { frames: parseStack(err.stack) } }] },
      ...(url ? { request: { method, url: url.split('?')[0] } } : {}),
    }
    const envelope = [JSON.stringify({ event_id: eventId, sent_at: new Date(now).toISOString(), dsn }), JSON.stringify({ type: 'event' }), JSON.stringify(event)].join('\n')

    try {
      await fetchImpl(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-sentry-envelope',
          'X-Sentry-Auth': `Sentry sentry_version=7, sentry_key=${key}, sentry_client=circuitbay-api/1.0`,
        },
        body: envelope,
      })
    } catch {
      // Never let error reporting break a request
    }
  }
}

// V8 stack ("    at fn (file:line:col)") → Sentry frames, oldest first
export function parseStack(stack = '') {
  const frames = []
  for (const line of stack.split('\n').slice(1)) {
    const m = line.match(/^\s*at (?:(.+?) \()?(.+?):(\d+):(\d+)\)?$/)
    if (m) frames.push({ function: m[1] ?? '<anonymous>', filename: m[2], lineno: Number(m[3]), colno: Number(m[4]), in_app: !/node_modules|node:/.test(m[2]) })
  }
  return frames.reverse()
}

import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { secureHeaders } from 'hono/secure-headers'
import { logger } from 'hono/logger'
import { bodyLimit } from 'hono/body-limit'
import { HttpError, forbidden } from './lib/errors.js'
import { loadUser } from './middleware/auth.js'
import { createEmailService } from './services/email.js'
import { createSmsService } from './services/sms.js'
import { createCourier } from './services/courier.js'
import { createPaymentProvider } from './services/payments.js'
import { createErrorReporter } from './lib/monitoring.js'
import { auth } from './routes/auth.js'
import { catalog } from './routes/catalog.js'
import { content } from './routes/content.js'
import { forms } from './routes/forms.js'
import { orders } from './routes/orders.js'
import { webhooks } from './routes/webhooks.js'
import { account } from './routes/account.js'
import { admin } from './routes/admin.js'
import { media } from './routes/media.js'
import { MAX_UPLOAD_BYTES } from './storage/index.js'
import { createMemoryCache } from './lib/cache.js'
import { PUBLIC_READ } from './middleware/cache.js'

// Bundle config + adapters into the service object every route reads from
// c.var.svc. Entry points (worker.js / node.js / tests) pick the adapters.
export function buildServices({ config, db, storage, cache = createMemoryCache(), log }) {
  return {
    config,
    db,
    storage,
    cache,
    email: createEmailService(config, { log }),
    sms: createSmsService(config, { log }),
    payments: createPaymentProvider(config),
    courier: createCourier(config, { db }),
    reportError: createErrorReporter(config),
  }
}

const DEV_ORIGINS = ['http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:4173']

// `getServices(c)` returns the services for this request (lets the Worker
// build them from per-request env bindings).
export function createApp(getServices) {
  const app = new Hono()

  app.use('*', async (c, next) => {
    c.set('svc', getServices(c))
    await next()
  })

  // Per-request logs in development only (Cloudflare records requests in
  // production; console logging per request would bottleneck Node)
  app.use('*', async (c, next) => {
    if (c.var.svc.config.APP_ENV === 'development') return logger()(c, next)
    await next()
  })

  app.use('*', secureHeaders({ crossOriginResourcePolicy: 'cross-origin' }))

  const allowedOrigins = (c) => {
    const { config } = c.var.svc
    return config.CORS_ORIGINS.length ? config.CORS_ORIGINS : config.APP_ENV === 'production' ? [] : DEV_ORIGINS
  }

  app.use('/api/*', async (c, next) =>
    cors({
      origin: (origin) => (allowedOrigins(c).includes(origin) ? origin : null),
      credentials: true,
      allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowHeaders: ['Content-Type'],
      maxAge: 600,
    })(c, next),
  )

  // CSRF guard for cookie-authenticated writes: a cross-site form post
  // can't send JSON without a CORS preflight, and foreign origins are
  // rejected outright. Webhooks (signed) and multipart uploads are exempt
  // from the JSON rule but uploads still need an allowed Origin. One-click
  // unsubscribe (RFC 8058) is a form post from the mail provider; it uses
  // no cookie and the token in the URL is the only credential.
  app.use('/api/*', async (c, next) => {
    const method = c.req.method
    if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS' || c.req.path.startsWith('/api/webhooks/')) return next()
    if (c.req.path === '/api/forms/newsletter/one-click') return next()
    const origin = c.req.header('origin')
    if (origin && !allowedOrigins(c).includes(origin) && origin !== new URL(c.req.url).origin) throw forbidden('Origin not allowed.')
    const type = c.req.header('content-type') ?? ''
    const isUpload = c.req.path === '/api/admin/uploads'
    if (!isUpload && method !== 'DELETE' && !type.startsWith('application/json')) {
      throw new HttpError(415, 'unsupported_media_type', 'Send JSON (Content-Type: application/json).')
    }
    return next()
  })

  app.use('/api/admin/uploads', bodyLimit({ maxSize: MAX_UPLOAD_BYTES + 64 * 1024, onError: () => { throw new HttpError(413, 'too_large', 'File is larger than 10 MB.') } }))
  app.use('/api/*', async (c, next) => {
    if (c.req.path === '/api/admin/uploads') return next()
    return bodyLimit({ maxSize: 256 * 1024, onError: () => { throw new HttpError(413, 'too_large', 'Request body too large.') } })(c, next)
  })

  // Public reads don't need the session lookup
  app.use('/api/*', (c, next) => (c.req.method === 'GET' && PUBLIC_READ.test(c.req.path) ? next() : loadUser(c, next)))

  app.get('/', (c) => c.json({ name: 'circuitbay-api', docs: '/api/health' }))
  app.get('/api/health', async (c) => {
    const { db, storage, payments } = c.var.svc
    let dbOk = true
    try {
      await db.first('SELECT 1 AS ok')
    } catch {
      dbOk = false
    }
    return c.json({ ok: dbOk, db: db.kind, storage: storage.kind, payments: payments.name, time: new Date().toISOString() }, dbOk ? 200 : 503)
  })

  app.route('/api/auth', auth)
  app.route('/api', catalog)
  app.route('/api', content)
  app.route('/api/forms', forms)
  app.route('/api', orders)
  app.route('/api/webhooks', webhooks)
  app.route('/api/me', account)
  app.route('/api/admin', admin)
  app.route('/media', media)

  app.notFound((c) => c.json({ error: { code: 'not_found', message: 'Route not found.' } }, 404))

  app.onError((err, c) => {
    if (err instanceof HttpError) {
      return c.json({ error: { code: err.code, message: err.message, ...(err.details ? { details: err.details } : {}) } }, err.status)
    }
    // Hono's own HTTPException (e.g. malformed JSON)
    if (typeof err?.getResponse === 'function' && err.status) {
      return c.json({ error: { code: 'bad_request', message: err.message || 'Bad request.' } }, err.status)
    }
    console.error(err)
    // Report unexpected errors; on Workers keep the request alive until sent
    const sent = c.var.svc?.reportError(err, { method: c.req.method, url: c.req.url })
    try {
      c.executionCtx.waitUntil(sent)
    } catch {
      // Node has no execution context — the report finishes on its own
    }
    return c.json({ error: { code: 'internal', message: 'Something went wrong on our side. Please try again.' } }, 500)
  })

  return app
}

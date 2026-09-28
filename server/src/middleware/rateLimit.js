import { tooMany } from '../lib/errors.js'

export function clientIp(c) {
  return (
    c.req.header('cf-connecting-ip') ||
    c.req.header('x-forwarded-for')?.split(',')[0].trim() ||
    c.env?.incoming?.socket?.remoteAddress ||
    'unknown'
  )
}

// Fixed-window counter stored in the database, so limits hold across every
// Worker isolate / Node instance. Throws 429 when `limit` is exceeded.
export async function hit(c, bucket, id, { limit, windowSec }) {
  const { db } = c.var.svc
  const now = Date.now()
  const windowStart = now - (now % (windowSec * 1000))
  const row = await db.first(
    `INSERT INTO rate_limits (key, window_start, count) VALUES (?, ?, 1)
     ON CONFLICT(key) DO UPDATE SET
       count = CASE WHEN rate_limits.window_start < excluded.window_start THEN 1 ELSE rate_limits.count + 1 END,
       window_start = MAX(rate_limits.window_start, excluded.window_start)
     RETURNING count`,
    [`${bucket}:${id}`, windowStart],
  )
  if (row && row.count > limit) throw tooMany()
}

// Route middleware: limit by client IP.
export const limitByIp = (bucket, opts) => async (c, next) => {
  await hit(c, bucket, clientIp(c), opts)
  await next()
}

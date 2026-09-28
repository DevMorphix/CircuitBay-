import { Hono } from 'hono'
import { notFound } from '../lib/errors.js'

// GET /media/<key> — streams objects out of R2. Only used when the bucket
// isn't exposed on a public domain (MEDIA_PUBLIC_URL). Keys are random and
// content-addressed per upload, so they can be cached forever.
export const media = new Hono()

media.get('/*', async (c) => {
  const key = decodeURIComponent(c.req.path.replace(/^\/media\//, ''))
  if (!key || key.includes('..')) throw notFound()
  const obj = await c.var.svc.storage.get(key)
  if (!obj) throw notFound('File not found.')

  if (obj.etag && c.req.header('if-none-match') === obj.etag) return c.body(null, 304)
  const headers = {
    'Content-Type': obj.contentType,
    'Cache-Control': 'public, max-age=31536000, immutable',
    'X-Content-Type-Options': 'nosniff',
    // SVGs can carry script; never render them as a document from our origin
    ...(obj.contentType === 'image/svg+xml' ? { 'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'" } : {}),
  }
  if (obj.etag) headers.ETag = obj.etag
  return c.body(obj.body, 200, headers)
})

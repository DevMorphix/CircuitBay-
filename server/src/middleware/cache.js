// Caches a public GET's JSON body (see lib/cache.js). The response goes out
// through Hono's context, so CORS/security headers are still applied per
// request. Also tells browsers and the Cloudflare CDN they may reuse it.
export const cached = (ttlSec) => async (c, next) => {
  const { cache } = c.var.svc
  const url = new URL(c.req.url)
  url.searchParams.sort()
  const key = url.pathname + url.search
  const browserCache = `public, max-age=${Math.min(ttlSec, 60)}, stale-while-revalidate=${ttlSec * 2}`

  const hit = await cache.get(key)
  if (hit != null) {
    c.header('X-Cache', 'HIT')
    c.header('Cache-Control', browserCache)
    return c.body(hit, 200, { 'Content-Type': 'application/json; charset=UTF-8' })
  }

  await next()
  if (c.res.status === 200) {
    await cache.set(key, await c.res.clone().text(), ttlSec)
    c.res.headers.set('X-Cache', 'MISS')
    c.res.headers.set('Cache-Control', browserCache)
  }
}

// Public read-only paths: served from cache, and they skip the session
// lookup (one less D1 read per request).
export const PUBLIC_READ = /^\/api\/(health|categories|products|articles|projects)(\/|$)/

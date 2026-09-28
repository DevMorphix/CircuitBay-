// Response cache for public, user-independent GETs (catalog, articles,
// projects). Under load this is what keeps D1 quiet: 10k shoppers browsing
// the same category page cost one query per TTL per location instead of
// one per request.
//
//   get(key) -> Promise<string | null>
//   set(key, text, ttlSec) -> Promise<void>
//   clear() -> Promise<void>        (called after admin writes)

// Workers: Cloudflare's per-location edge cache (Cache API). Works on a
// custom domain (not *.workers.dev). Entries expire by TTL; clear() is a
// no-op, so admin edits show up within one TTL.
export function createEdgeCache(cache = globalThis.caches?.default) {
  const req = (key) => new Request(`https://api-cache.internal${key}`)
  return {
    kind: 'edge',
    async get(key) {
      if (!cache) return null
      const res = await cache.match(req(key))
      return res ? res.text() : null
    },
    async set(key, text, ttlSec) {
      if (!cache) return
      await cache.put(req(key), new Response(text, { headers: { 'Cache-Control': `public, s-maxage=${ttlSec}` } }))
    },
    async clear() {},
  }
}

// Node: in-process LRU with expiry. clear() empties it, so admin edits
// are visible immediately on this instance.
export function createMemoryCache({ maxEntries = 1000 } = {}) {
  const map = new Map()
  return {
    kind: 'memory',
    async get(key) {
      const hit = map.get(key)
      if (!hit) return null
      if (hit.expires < Date.now()) {
        map.delete(key)
        return null
      }
      map.delete(key) // refresh LRU position
      map.set(key, hit)
      return hit.text
    },
    async set(key, text, ttlSec) {
      map.delete(key)
      map.set(key, { text, expires: Date.now() + ttlSec * 1000 })
      if (map.size > maxEntries) map.delete(map.keys().next().value)
    },
    async clear() {
      map.clear()
    },
  }
}

// Disabled cache (tests that need fresh reads every time)
export const noCache = { kind: 'none', get: async () => null, set: async () => {}, clear: async () => {} }

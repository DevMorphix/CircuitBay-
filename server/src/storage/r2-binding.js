// Adapter over a Cloudflare R2 bucket binding (env.BUCKET inside a Worker).
export function createR2BindingStorage(bucket) {
  return {
    kind: 'r2-binding',
    async put(key, body, { contentType } = {}) {
      await bucket.put(key, body, { httpMetadata: { contentType } })
    },
    async get(key) {
      const obj = await bucket.get(key)
      if (!obj) return null
      return {
        body: obj.body,
        contentType: obj.httpMetadata?.contentType ?? 'application/octet-stream',
        size: obj.size,
        etag: obj.httpEtag,
      }
    },
    async delete(key) {
      await bucket.delete(key)
    },
  }
}

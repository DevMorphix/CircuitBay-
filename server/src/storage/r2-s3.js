import { AwsClient } from 'aws4fetch'

// Adapter over R2's S3-compatible API — used when the API runs as a plain
// Node server. Create an R2 API token (Object Read & Write) in the
// Cloudflare dashboard to get the access key pair.
export function createR2S3Storage({ accountId, bucket, accessKeyId, secretAccessKey }) {
  const client = new AwsClient({ accessKeyId, secretAccessKey, service: 's3', region: 'auto' })
  const base = `https://${accountId}.r2.cloudflarestorage.com/${bucket}`
  const url = (key) => `${base}/${key.split('/').map(encodeURIComponent).join('/')}`

  return {
    kind: 'r2-s3',
    async put(key, body, { contentType } = {}) {
      const res = await client.fetch(url(key), {
        method: 'PUT',
        body,
        headers: contentType ? { 'Content-Type': contentType } : {},
      })
      if (!res.ok) throw new Error(`R2 put failed: HTTP ${res.status} ${await res.text()}`)
    },
    async get(key) {
      const res = await client.fetch(url(key))
      if (res.status === 404) return null
      if (!res.ok) throw new Error(`R2 get failed: HTTP ${res.status}`)
      return {
        body: res.body,
        contentType: res.headers.get('content-type') ?? 'application/octet-stream',
        size: Number(res.headers.get('content-length') ?? 0),
        etag: res.headers.get('etag'),
      }
    },
    async delete(key) {
      const res = await client.fetch(url(key), { method: 'DELETE' })
      if (!res.ok && res.status !== 404) throw new Error(`R2 delete failed: HTTP ${res.status}`)
    },
  }
}

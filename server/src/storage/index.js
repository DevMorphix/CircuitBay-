// Storage interface (Cloudflare R2 in production):
//   put(key, body: ArrayBuffer|Uint8Array, { contentType }) -> Promise<void>
//   get(key) -> Promise<{ body: ReadableStream|Uint8Array, contentType, size, etag } | null>
//   delete(key) -> Promise<void>
//
// Adapters: r2-binding.js (Workers), r2-s3.js (Node via R2's S3 API),
// local-disk.js (dev/tests). Entry points import the adapter they need.

export const ALLOWED_UPLOAD_TYPES = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/avif': 'avif',
  'image/svg+xml': 'svg',
  'application/pdf': 'pdf',
}
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024

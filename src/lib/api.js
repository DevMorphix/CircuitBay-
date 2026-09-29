// Thin client for the CircuitBay API (server/). Same-origin `/api` in
// development (Vite proxies it); set VITE_API_URL=https://api.circuitbay.in
// for production builds. The session lives in an httpOnly cookie, so every
// request is sent with credentials.
const BASE = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '')

export class ApiError extends Error {
  constructor(status, code, message, details) {
    super(message)
    this.status = status
    this.code = code
    this.details = details
  }
}

async function request(method, path, body) {
  const isForm = body instanceof FormData
  let res
  try {
    res = await fetch(`${BASE}/api${path}`, {
      method,
      credentials: 'include',
      // The API only accepts JSON writes (CSRF protection); file uploads send
      // multipart and the browser sets that header itself
      headers: body !== undefined && !isForm ? { 'Content-Type': 'application/json' } : undefined,
      body: body === undefined ? undefined : isForm ? body : JSON.stringify(body),
    })
  } catch {
    throw new ApiError(0, 'network', "Can't reach CircuitBay right now. Check your connection and try again.")
  }
  const data = await res.json().catch(() => null)
  if (!res.ok) {
    const e = data?.error ?? {}
    throw new ApiError(res.status, e.code ?? 'error', e.message ?? 'Something went wrong. Please try again.', e.details)
  }
  return data
}

export const api = {
  get: (path) => request('GET', path),
  post: (path, body = {}) => request('POST', path, body),
  put: (path, body = {}) => request('PUT', path, body),
  patch: (path, body = {}) => request('PATCH', path, body),
  del: (path) => request('DELETE', path),
  // Admin file upload → { key, url, contentType, size }
  upload: (file, folder) => {
    const form = new FormData()
    form.set('file', file)
    if (folder) form.set('folder', folder)
    return request('POST', '/admin/uploads', form)
  },
}

// Opens an invoice (HTML from the API) in a new tab. The tab is opened
// first — synchronously, inside the click — so popup blockers allow it,
// then filled once the invoice arrives.
export async function openInvoice(method, path, body) {
  const tab = window.open('', '_blank')
  try {
    const res = await fetch(`${BASE}/api${path}`, {
      method,
      credentials: 'include',
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    })
    if (!res.ok) {
      const e = (await res.json().catch(() => null))?.error
      throw new ApiError(res.status, e?.code ?? 'error', e?.message ?? "Couldn't load the invoice.")
    }
    const url = URL.createObjectURL(new Blob([await res.text()], { type: 'text/html' }))
    if (tab) tab.location.href = url
    else window.location.href = url
  } catch (err) {
    tab?.close()
    throw err
  }
}

// Field-level messages from a 400 response: { email: '…', 'address.pin': '…' }
export const fieldErrors = (err) =>
  Object.fromEntries((err?.details ?? []).filter((d) => d.path).map((d) => [d.path, d.message]))

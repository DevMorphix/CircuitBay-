// Web Crypto only, so the same code runs on Workers and Node.

const enc = new TextEncoder()

export const toHex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')
const fromHex = (hex) => new Uint8Array(hex.match(/.{2}/g).map((h) => parseInt(h, 16)))

export function randomBytes(n) {
  return crypto.getRandomValues(new Uint8Array(n))
}

// URL-safe random token (for sessions, reset links, unsubscribe links)
export function randomToken(bytes = 32) {
  return btoa(String.fromCharCode(...randomBytes(bytes))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

// Short random id from an unambiguous alphabet (no 0/O/1/I)
const ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'
export function randomId(length = 12, prefix = '') {
  const bytes = randomBytes(length)
  let out = ''
  for (const b of bytes) out += ALPHABET[b % ALPHABET.length]
  return prefix + out
}

export function randomDigits(n = 6) {
  // Rejection sampling keeps the distribution uniform
  let out = ''
  while (out.length < n) {
    for (const b of randomBytes(n)) if (b < 250 && out.length < n) out += String(b % 10)
  }
  return out
}

export async function sha256Hex(text) {
  return toHex(await crypto.subtle.digest('SHA-256', enc.encode(text)))
}

export async function hmacSha256Hex(secret, message) {
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  return toHex(await crypto.subtle.sign('HMAC', key, enc.encode(message)))
}

export function timingSafeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

// Password hashing: PBKDF2-SHA256. 100k iterations is the maximum Workers'
// Web Crypto allows. Stored as `pbkdf2$<iterations>$<saltHex>$<hashHex>`.
const PBKDF2_ITERATIONS = 100_000

async function pbkdf2(password, salt, iterations) {
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits'])
  return crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations }, key, 256)
}

export async function hashPassword(password) {
  const salt = randomBytes(16)
  const hash = await pbkdf2(password, salt, PBKDF2_ITERATIONS)
  return `pbkdf2$${PBKDF2_ITERATIONS}$${toHex(salt)}$${toHex(hash)}`
}

export async function verifyPassword(password, stored) {
  if (!stored) return false
  const [scheme, iter, saltHex, hashHex] = stored.split('$')
  if (scheme !== 'pbkdf2') return false
  const hash = await pbkdf2(password, fromHex(saltHex), Number(iter))
  return timingSafeEqual(toHex(hash), hashHex)
}

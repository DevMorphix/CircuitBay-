import { getCookie, setCookie, deleteCookie } from 'hono/cookie'
import { randomToken, sha256Hex } from '../lib/crypto.js'
import { forbidden, unauthorized } from '../lib/errors.js'

export const SESSION_COOKIE = 'cb_session'

// Loads the signed-in user (if any) into c.var.user on every request.
export async function loadUser(c, next) {
  const token = getCookie(c, SESSION_COOKIE)
  c.set('user', null)
  if (token) {
    const { db } = c.var.svc
    const row = await db.first(
      `SELECT u.id, u.email, u.phone, u.name, u.role, u.email_verified, u.phone_verified, s.token_hash
         FROM sessions s JOIN users u ON u.id = s.user_id
        WHERE s.token_hash = ? AND s.expires_at > ?`,
      [await sha256Hex(token), Date.now()],
    )
    if (row) c.set('user', row)
  }
  await next()
}

export async function requireUser(c, next) {
  if (!c.var.user) throw unauthorized()
  await next()
}

export async function requireAdmin(c, next) {
  if (!c.var.user) throw unauthorized()
  if (c.var.user.role !== 'admin') throw forbidden()
  await next()
}

export async function startSession(c, userId) {
  const { db, config } = c.var.svc
  const token = randomToken()
  const ttlMs = config.SESSION_TTL_DAYS * 86_400_000
  const now = Date.now()
  await db.run('INSERT INTO sessions (token_hash, user_id, expires_at, created_at, user_agent) VALUES (?, ?, ?, ?, ?)', [
    await sha256Hex(token),
    userId,
    now + ttlMs,
    now,
    c.req.header('user-agent')?.slice(0, 200),
  ])
  // Opportunistic cleanup of this user's expired sessions
  await db.run('DELETE FROM sessions WHERE user_id = ? AND expires_at < ?', [userId, now])
  setCookie(c, SESSION_COOKIE, token, {
    httpOnly: true,
    secure: config.APP_ENV === 'production',
    sameSite: 'Lax',
    path: '/',
    domain: config.COOKIE_DOMAIN || undefined,
    maxAge: Math.floor(ttlMs / 1000),
  })
}

export async function endSession(c) {
  const { db, config } = c.var.svc
  if (c.var.user?.token_hash) await db.run('DELETE FROM sessions WHERE token_hash = ?', [c.var.user.token_hash])
  deleteCookie(c, SESSION_COOKIE, { path: '/', domain: config.COOKIE_DOMAIN || undefined })
}

// Public shape of a user — never leak hashes.
export const publicUser = (u) =>
  u && {
    id: u.id,
    email: u.email,
    phone: u.phone,
    name: u.name,
    role: u.role,
    emailVerified: Boolean(u.email_verified),
    phoneVerified: Boolean(u.phone_verified),
  }

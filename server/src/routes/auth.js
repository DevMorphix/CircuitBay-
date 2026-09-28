import { Hono } from 'hono'
import { z } from 'zod'
import { body } from '../middleware/validate.js'
import { endSession, publicUser, requireUser, startSession } from '../middleware/auth.js'
import { hit, limitByIp } from '../middleware/rateLimit.js'
import { hashPassword, randomDigits, randomId, randomToken, sha256Hex, timingSafeEqual, verifyPassword } from '../lib/crypto.js'
import { badRequest, conflict, unauthorized } from '../lib/errors.js'
import * as s from '../lib/schemas.js'
import { emails } from '../services/email.js'

const OTP_TTL_MS = 10 * 60_000
const OTP_MAX_ATTEMPTS = 5
const RESET_TTL_MS = 60 * 60_000

// Used so a login for an unknown email costs the same as a real one
const DUMMY_HASH = 'pbkdf2$100000$00000000000000000000000000000000$0000000000000000000000000000000000000000000000000000000000000000'

export const auth = new Hono()

// ---------------------------------------------------------- email/password
auth.post(
  '/register',
  limitByIp('register', { limit: 10, windowSec: 3600 }),
  body(z.object({ email: s.email, password: s.password, name: s.name.optional(), phone: s.phone.optional() })),
  async (c) => {
    const { db, config } = c.var.svc
    const { email, password, name, phone } = c.req.valid('json')

    if (await db.first('SELECT 1 FROM users WHERE email = ?', [email])) {
      throw conflict('An account with this email already exists. Try signing in.')
    }
    if (phone && (await db.first('SELECT 1 FROM users WHERE phone = ?', [phone]))) {
      throw conflict('This phone number is already linked to another account.')
    }

    const id = randomId(16, 'usr_')
    const now = Date.now()
    const role = config.ADMIN_EMAILS.map((e) => e.toLowerCase()).includes(email) ? 'admin' : 'customer'
    await db.run(
      `INSERT INTO users (id, email, phone, password_hash, name, role, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, email, phone, await hashPassword(password), name, role, now, now],
    )
    await startSession(c, id)
    const user = await db.first('SELECT * FROM users WHERE id = ?', [id])
    return c.json({ user: publicUser(user) }, 201)
  },
)

auth.post(
  '/login',
  limitByIp('login-ip', { limit: 30, windowSec: 900 }),
  body(z.object({ email: s.email, password: z.string().min(1).max(200) })),
  async (c) => {
    const { db } = c.var.svc
    const { email, password } = c.req.valid('json')
    await hit(c, 'login-email', email, { limit: 10, windowSec: 900 })

    const user = await db.first('SELECT * FROM users WHERE email = ?', [email])
    const ok = await verifyPassword(password, user?.password_hash ?? DUMMY_HASH)
    if (!user || !ok) throw unauthorized('Email or password is incorrect.')

    await startSession(c, user.id)
    return c.json({ user: publicUser(user) })
  },
)

auth.post('/logout', async (c) => {
  await endSession(c)
  return c.json({ ok: true })
})

auth.get('/me', (c) => c.json({ user: publicUser(c.var.user) }))

auth.post(
  '/password/change',
  requireUser,
  body(z.object({ currentPassword: z.string().max(200).optional(), newPassword: s.password })),
  async (c) => {
    const { db } = c.var.svc
    const { currentPassword, newPassword } = c.req.valid('json')
    const user = await db.first('SELECT * FROM users WHERE id = ?', [c.var.user.id])
    // Phone-only accounts can set a first password without a current one
    if (user.password_hash && !(await verifyPassword(currentPassword ?? '', user.password_hash))) {
      throw unauthorized('Current password is incorrect.')
    }
    await db.batch([
      { sql: 'UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?', params: [await hashPassword(newPassword), Date.now(), user.id] },
      // Sign out every other device
      { sql: 'DELETE FROM sessions WHERE user_id = ? AND token_hash != ?', params: [user.id, c.var.user.token_hash] },
    ])
    return c.json({ ok: true })
  },
)

auth.post(
  '/password/forgot',
  limitByIp('forgot', { limit: 10, windowSec: 3600 }),
  body(z.object({ email: s.email })),
  async (c) => {
    const { db, email: mailer, config } = c.var.svc
    const { email } = c.req.valid('json')
    await hit(c, 'forgot-email', email, { limit: 3, windowSec: 3600 })

    const user = await db.first('SELECT id FROM users WHERE email = ?', [email])
    if (user) {
      const token = randomToken()
      await db.run(
        `INSERT INTO verification_codes (id, purpose, target, code_hash, expires_at, created_at)
         VALUES (?, 'password_reset', ?, ?, ?, ?)`,
        [randomId(16), email, await sha256Hex(token), Date.now() + RESET_TTL_MS, Date.now()],
      )
      await mailer.send({ to: email, ...emails.passwordReset(config.SITE_URL, token) })
    }
    // Same response either way — don't reveal which emails have accounts
    return c.json({ ok: true, message: 'If that email has an account, a reset link is on its way.' })
  },
)

auth.post(
  '/password/reset',
  limitByIp('reset', { limit: 20, windowSec: 3600 }),
  body(z.object({ token: z.string().min(10).max(200), password: s.password })),
  async (c) => {
    const { db } = c.var.svc
    const { token, password } = c.req.valid('json')
    const code = await db.first(
      `SELECT * FROM verification_codes
        WHERE purpose = 'password_reset' AND code_hash = ? AND consumed_at IS NULL AND expires_at > ?`,
      [await sha256Hex(token), Date.now()],
    )
    if (!code) throw badRequest('This reset link is invalid or has expired. Request a new one.')
    const user = await db.first('SELECT * FROM users WHERE email = ?', [code.target])
    if (!user) throw badRequest('This reset link is invalid or has expired. Request a new one.')

    const now = Date.now()
    await db.batch([
      { sql: 'UPDATE users SET password_hash = ?, email_verified = 1, updated_at = ? WHERE id = ?', params: [await hashPassword(password), now, user.id] },
      { sql: 'UPDATE verification_codes SET consumed_at = ? WHERE id = ?', params: [now, code.id] },
      { sql: 'DELETE FROM sessions WHERE user_id = ?', params: [user.id] },
    ])
    await startSession(c, user.id)
    return c.json({ user: publicUser(user) })
  },
)

// --------------------------------------------------------------- phone OTP
auth.post(
  '/otp/request',
  limitByIp('otp-ip', { limit: 20, windowSec: 3600 }),
  body(z.object({ phone: s.phone })),
  async (c) => {
    const { db, sms } = c.var.svc
    const { phone } = c.req.valid('json')
    await hit(c, 'otp-phone', phone, { limit: 5, windowSec: 3600 })

    const code = randomDigits(6)
    const id = randomId(16)
    const now = Date.now()
    await db.batch([
      // A new code invalidates any earlier unused one
      { sql: `UPDATE verification_codes SET consumed_at = ? WHERE purpose = 'phone_login' AND target = ? AND consumed_at IS NULL`, params: [now, phone] },
      {
        sql: `INSERT INTO verification_codes (id, purpose, target, code_hash, expires_at, created_at) VALUES (?, 'phone_login', ?, ?, ?, ?)`,
        params: [id, phone, await sha256Hex(`${id}:${code}`), now + OTP_TTL_MS, now],
      },
    ])
    await sms.sendOtp(phone, code)
    return c.json({ ok: true, expiresInSec: OTP_TTL_MS / 1000 })
  },
)

auth.post(
  '/otp/verify',
  limitByIp('otp-verify', { limit: 30, windowSec: 900 }),
  body(z.object({ phone: s.phone, code: z.string().trim().regex(/^\d{6}$/, 'Enter the 6-digit code.'), name: s.name.optional() })),
  async (c) => {
    const { db } = c.var.svc
    const { phone, code, name } = c.req.valid('json')
    const now = Date.now()
    const row = await db.first(
      `SELECT * FROM verification_codes
        WHERE purpose = 'phone_login' AND target = ? AND consumed_at IS NULL AND expires_at > ?
        ORDER BY created_at DESC LIMIT 1`,
      [phone, now],
    )
    const invalid = badRequest('That code is incorrect or has expired.')
    if (!row || row.attempts >= OTP_MAX_ATTEMPTS) throw invalid

    const matches = timingSafeEqual(await sha256Hex(`${row.id}:${code}`), row.code_hash)
    if (!matches) {
      await db.run('UPDATE verification_codes SET attempts = attempts + 1 WHERE id = ?', [row.id])
      throw invalid
    }
    await db.run('UPDATE verification_codes SET consumed_at = ? WHERE id = ?', [now, row.id])

    // Existing phone account → sign in. Signed-in user without a phone →
    // link it. Otherwise create a phone-only account.
    let user = await db.first('SELECT * FROM users WHERE phone = ?', [phone])
    if (user) {
      await db.run('UPDATE users SET phone_verified = 1, updated_at = ? WHERE id = ?', [now, user.id])
    } else if (c.var.user && !c.var.user.phone) {
      await db.run('UPDATE users SET phone = ?, phone_verified = 1, updated_at = ? WHERE id = ?', [phone, now, c.var.user.id])
      user = await db.first('SELECT * FROM users WHERE id = ?', [c.var.user.id])
      return c.json({ user: publicUser(user), linked: true })
    } else {
      const id = randomId(16, 'usr_')
      await db.run(
        `INSERT INTO users (id, phone, name, phone_verified, created_at, updated_at) VALUES (?, ?, ?, 1, ?, ?)`,
        [id, phone, name, now, now],
      )
      user = { id }
    }
    await startSession(c, user.id)
    user = await db.first('SELECT * FROM users WHERE id = ?', [user.id])
    return c.json({ user: publicUser(user) })
  },
)

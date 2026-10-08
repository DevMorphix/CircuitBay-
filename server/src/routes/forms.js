import { Hono } from 'hono'
import { z } from 'zod'
import { body } from '../middleware/validate.js'
import { limitByIp } from '../middleware/rateLimit.js'
import { randomId, randomToken } from '../lib/crypto.js'
import { notFound } from '../lib/errors.js'
import { json } from '../db/index.js'
import * as s from '../lib/schemas.js'
import { emails } from '../services/email.js'

// Public form endpoints (contact, workshop, newsletter, project
// submissions). All rate-limited; each has a hidden honeypot field
// (`website`) that real users leave empty.
export const forms = new Hono()

const honeypot = { website: z.string().max(0).optional() }
const limit = limitByIp('forms', { limit: 10, windowSec: 3600 })

// Tell the team about new inbound requests (best effort)
async function notifyTeam(c, kind, summary) {
  const { email, config } = c.var.svc
  const to = config.ADMIN_EMAILS[0]
  if (!to) return
  try {
    await email.send({ to, ...emails.newSubmission(kind, summary) })
  } catch (err) {
    console.error('notifyTeam failed', err)
  }
}

forms.post(
  '/contact',
  limit,
  body(
    z.object({
      name: s.name,
      email: s.email,
      phone: z.string().trim().max(20).optional(),
      role: z.enum(['Student', 'Educator', 'Institution', 'Hobbyist']).optional(),
      message: z.string().trim().min(5).max(5000),
      ...honeypot,
    }),
  ),
  async (c) => {
    const d = c.req.valid('json')
    const id = randomId(12, 'msg_')
    await c.var.svc.db.run(
      'INSERT INTO contact_messages (id, name, email, phone, role, message, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [id, d.name, d.email, d.phone, d.role, d.message, Date.now()],
    )
    await notifyTeam(c, 'contact message', `${d.name} <${d.email}> (${d.role ?? 'n/a'})\n\n${d.message}`)
    return c.json({ ok: true, id }, 201)
  },
)

forms.post(
  '/workshop-requests',
  limit,
  body(
    z.object({
      institution: z.string().trim().min(2).max(200),
      contactName: s.name,
      email: s.email,
      phone: s.phone,
      interest: z.string().trim().max(100).optional(),
      studentCount: z.coerce.number().int().min(1).max(100000).optional(),
      message: z.string().trim().max(5000).optional(),
      ...honeypot,
    }),
  ),
  async (c) => {
    const d = c.req.valid('json')
    const id = randomId(12, 'wsr_')
    await c.var.svc.db.run(
      `INSERT INTO workshop_requests (id, institution, contact_name, email, phone, interest, student_count, message, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, d.institution, d.contactName, d.email, d.phone, d.interest, d.studentCount, d.message, Date.now()],
    )
    await notifyTeam(c, 'workshop request', `${d.institution} — ${d.contactName} <${d.email}>, ${d.phone}\nInterest: ${d.interest ?? 'n/a'}, students: ${d.studentCount ?? 'n/a'}\n\n${d.message ?? ''}`)
    return c.json({ ok: true, id }, 201)
  },
)

forms.post(
  '/newsletter',
  limit,
  body(z.object({ email: s.email, source: z.string().max(40).optional(), ...honeypot })),
  async (c) => {
    const { db, email: mailer, config } = c.var.svc
    const { email, source } = c.req.valid('json')
    const prev = await db.first('SELECT status, unsubscribe_token FROM newsletter_subscribers WHERE email = ?', [email])
    await db.run(
      `INSERT INTO newsletter_subscribers (email, source, unsubscribe_token, created_at) VALUES (?, ?, ?, ?)
       ON CONFLICT(email) DO UPDATE SET status = 'subscribed'`,
      [email, source, randomToken(18), Date.now()],
    )
    // Welcome email only for new (or returning) subscribers, not repeats
    if (prev?.status !== 'subscribed') {
      const { unsubscribe_token: token } = await db.first('SELECT unsubscribe_token FROM newsletter_subscribers WHERE email = ?', [email])
      await mailer.syncAudience(email, true)
      try {
        await mailer.send({
          to: email,
          ...emails.newsletterWelcome(config.SITE_URL, `${config.SITE_URL}/unsubscribe?token=${encodeURIComponent(token)}`),
          headers: {
            'List-Unsubscribe': `<${config.API_PUBLIC_URL}/api/forms/newsletter/one-click?token=${encodeURIComponent(token)}>`,
            'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
          },
        })
      } catch (err) {
        console.error('newsletter welcome email failed', err)
      }
    }
    return c.json({ ok: true }, 201)
  },
)

async function unsubscribe(c, token) {
  const { db, email: mailer } = c.var.svc
  const row = await db.first('SELECT email FROM newsletter_subscribers WHERE unsubscribe_token = ?', [token])
  if (!row) return false
  await db.run(`UPDATE newsletter_subscribers SET status = 'unsubscribed' WHERE unsubscribe_token = ?`, [token])
  await mailer.syncAudience(row.email, false)
  return true
}

// From the /unsubscribe page (link in every newsletter email)
forms.post(
  '/newsletter/unsubscribe',
  limitByIp('unsubscribe', { limit: 30, windowSec: 3600 }),
  body(z.object({ token: z.string().min(10).max(100) })),
  async (c) => {
    const found = await unsubscribe(c, c.req.valid('json').token)
    if (!found) throw notFound('This unsubscribe link is invalid. You may already be unsubscribed.')
    return c.json({ ok: true })
  },
)

// One-click unsubscribe from the mail app (List-Unsubscribe-Post, RFC 8058)
forms.post('/newsletter/one-click', limitByIp('unsubscribe', { limit: 30, windowSec: 3600 }), async (c) => {
  const token = c.req.query('token') ?? ''
  if (token.length >= 10 && token.length <= 100) await unsubscribe(c, token)
  return c.body(null, 204)
})

forms.post(
  '/project-submissions',
  limit,
  body(
    z.object({
      title: z.string().trim().min(2).max(120),
      email: s.email,
      builder: s.name.optional(),
      link: z.string().trim().url().max(500).optional().or(z.literal('')),
      description: z.string().trim().max(5000).optional(),
      tags: z.array(z.string().trim().max(40)).max(10).optional(),
      ...honeypot,
    }),
  ),
  async (c) => {
    const d = c.req.valid('json')
    const id = randomId(12, 'prj_')
    const now = Date.now()
    await c.var.svc.db.run(
      `INSERT INTO projects (id, title, description, tags, builder, builder_email, link, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)`,
      [id, d.title, d.description, json(d.tags ?? []), d.builder, d.email, d.link || null, now, now],
    )
    await notifyTeam(c, 'project submission', `${d.title} by ${d.builder ?? d.email}\n${d.link ?? ''}\n\n${d.description ?? ''}`)
    return c.json({ ok: true, id }, 201)
  },
)

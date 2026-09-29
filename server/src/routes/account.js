import { Hono } from 'hono'
import { z } from 'zod'
import { body } from '../middleware/validate.js'
import { publicUser, requireUser } from '../middleware/auth.js'
import { randomId } from '../lib/crypto.js'
import { conflict, notFound } from '../lib/errors.js'
import { product } from '../lib/serializers.js'
import * as s from '../lib/schemas.js'
import { sendEmailVerification } from './auth.js'

// Signed-in customer: profile, saved addresses, wishlist.
// (Orders live in routes/orders.js under /me/orders.)
export const account = new Hono()
account.use('*', requireUser)

account.patch('/profile', body(z.object({ name: s.name.optional(), email: s.email.optional() })), async (c) => {
  const { db } = c.var.svc
  const d = c.req.valid('json')
  const me = c.var.user
  if (d.email && d.email !== me.email) {
    if (await db.first('SELECT 1 FROM users WHERE email = ? AND id != ?', [d.email, me.id])) {
      throw conflict('That email is already used by another account.')
    }
  }
  await db.run(
    `UPDATE users SET name = COALESCE(?, name), email = COALESCE(?, email),
       email_verified = CASE WHEN ? IS NOT NULL AND ? != IFNULL(email, '') THEN 0 ELSE email_verified END,
       updated_at = ? WHERE id = ?`,
    [d.name, d.email, d.email, d.email, Date.now(), me.id],
  )
  if (d.email && d.email !== me.email) await sendEmailVerification(c.var.svc, d.email)
  return c.json({ user: publicUser(await db.first('SELECT * FROM users WHERE id = ?', [me.id])) })
})

// ---- addresses ----
const addressOut = (a) => ({
  id: a.id, label: a.label, name: a.name, phone: a.phone, line1: a.line1, line2: a.line2,
  city: a.city, state: a.state, pin: a.pin, isDefault: Boolean(a.is_default),
})
const addressIn = s.address.extend({ label: z.string().trim().max(40).optional(), isDefault: z.boolean().optional() })

account.get('/addresses', async (c) => {
  const rows = await c.var.svc.db.all('SELECT * FROM addresses WHERE user_id = ? ORDER BY is_default DESC, created_at', [c.var.user.id])
  return c.json({ addresses: rows.map(addressOut) })
})

account.post('/addresses', body(addressIn), async (c) => {
  const { db } = c.var.svc
  const d = c.req.valid('json')
  const uid = c.var.user.id
  const count = (await db.first('SELECT COUNT(*) AS n FROM addresses WHERE user_id = ?', [uid])).n
  if (count >= 20) throw conflict('You can save up to 20 addresses.')
  const id = randomId(12, 'adr_')
  const isDefault = d.isDefault || count === 0
  await db.batch([
    ...(isDefault ? [{ sql: 'UPDATE addresses SET is_default = 0 WHERE user_id = ?', params: [uid] }] : []),
    {
      sql: `INSERT INTO addresses (id, user_id, label, name, phone, line1, line2, city, state, pin, is_default, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      params: [id, uid, d.label, d.name, d.phone, d.line1, d.line2, d.city, d.state, d.pin, isDefault ? 1 : 0, Date.now()],
    },
  ])
  return c.json({ address: addressOut(await db.first('SELECT * FROM addresses WHERE id = ?', [id])) }, 201)
})

account.put('/addresses/:id', body(addressIn), async (c) => {
  const { db } = c.var.svc
  const d = c.req.valid('json')
  const uid = c.var.user.id
  const id = c.req.param('id')
  if (!(await db.first('SELECT 1 FROM addresses WHERE id = ? AND user_id = ?', [id, uid]))) throw notFound('Address not found.')
  await db.batch([
    ...(d.isDefault ? [{ sql: 'UPDATE addresses SET is_default = 0 WHERE user_id = ?', params: [uid] }] : []),
    {
      sql: `UPDATE addresses SET label = ?, name = ?, phone = ?, line1 = ?, line2 = ?, city = ?, state = ?, pin = ?,
              is_default = CASE WHEN ? THEN 1 ELSE is_default END WHERE id = ? AND user_id = ?`,
      params: [d.label, d.name, d.phone, d.line1, d.line2, d.city, d.state, d.pin, d.isDefault ? 1 : 0, id, uid],
    },
  ])
  return c.json({ address: addressOut(await db.first('SELECT * FROM addresses WHERE id = ?', [id])) })
})

account.delete('/addresses/:id', async (c) => {
  const res = await c.var.svc.db.run('DELETE FROM addresses WHERE id = ? AND user_id = ?', [c.req.param('id'), c.var.user.id])
  if (!res.changes) throw notFound('Address not found.')
  return c.json({ ok: true })
})

// ---- wishlist ----
account.get('/wishlist', async (c) => {
  const { db, config } = c.var.svc
  const rows = await db.all(
    `SELECT p.* FROM wishlist_items w JOIN products p ON p.id = w.product_id
      WHERE w.user_id = ? AND p.active = 1 ORDER BY w.created_at DESC`,
    [c.var.user.id],
  )
  return c.json({ products: rows.map(product(config)) })
})

account.put('/wishlist/:productId', async (c) => {
  const { db } = c.var.svc
  const pid = c.req.param('productId')
  if (!(await db.first('SELECT 1 FROM products WHERE id = ? AND active = 1', [pid]))) throw notFound('Product not found.')
  await db.run('INSERT INTO wishlist_items (user_id, product_id, created_at) VALUES (?, ?, ?) ON CONFLICT DO NOTHING', [c.var.user.id, pid, Date.now()])
  return c.json({ ok: true })
})

account.delete('/wishlist/:productId', async (c) => {
  await c.var.svc.db.run('DELETE FROM wishlist_items WHERE user_id = ? AND product_id = ?', [c.var.user.id, c.req.param('productId')])
  return c.json({ ok: true })
})

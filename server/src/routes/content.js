import { Hono } from 'hono'
import { z } from 'zod'
import { query } from '../middleware/validate.js'
import { cached } from '../middleware/cache.js'
import { notFound } from '../lib/errors.js'
import { article, project } from '../lib/serializers.js'

export const content = new Hono()

content.get(
  '/articles',
  cached(300),
  query(
    z.object({
      category: z.string().optional(),
      q: z.string().trim().max(100).optional(),
      featured: z.enum(['true', 'false']).optional(),
      page: z.coerce.number().int().min(1).default(1),
      limit: z.coerce.number().int().min(1).max(30).default(9),
    }),
  ),
  async (c) => {
    const { db, config } = c.var.svc
    const f = c.req.valid('query')
    const where = [`status = 'published'`, 'published_at <= ?']
    const params = [Date.now()]
    if (f.category) {
      where.push('category = ?')
      params.push(f.category)
    }
    if (f.featured) {
      where.push('featured = ?')
      params.push(f.featured === 'true' ? 1 : 0)
    }
    if (f.q) {
      where.push(`(title LIKE ? ESCAPE '\\' OR excerpt LIKE ? ESCAPE '\\')`)
      const like = `%${f.q.replace(/[\\%_]/g, (m) => `\\${m}`)}%`
      params.push(like, like)
    }
    const w = where.join(' AND ')
    const [rows, [{ total }]] = await Promise.all([
      db.all(`SELECT * FROM articles WHERE ${w} ORDER BY published_at DESC LIMIT ? OFFSET ?`, [...params, f.limit, (f.page - 1) * f.limit]),
      db.all(`SELECT COUNT(*) AS total FROM articles WHERE ${w}`, params),
    ])
    return c.json({ articles: rows.map(article(config)), page: f.page, total, pages: Math.max(1, Math.ceil(total / f.limit)) })
  },
)

content.get('/articles/:slug', cached(300), async (c) => {
  const { db, config } = c.var.svc
  const row = await db.first(`SELECT * FROM articles WHERE slug = ? AND status = 'published' AND published_at <= ?`, [
    c.req.param('slug'),
    Date.now(),
  ])
  if (!row) throw notFound('Article not found.')
  return c.json({ article: article(config, { withBody: true })(row) })
})

content.get(
  '/projects',
  cached(300),
  query(z.object({ category: z.string().optional(), featured: z.enum(['true', 'false']).optional(), limit: z.coerce.number().int().min(1).max(50).default(24) })),
  async (c) => {
    const { db, config } = c.var.svc
    const f = c.req.valid('query')
    const where = [`status = 'published'`]
    const params = []
    if (f.category) {
      where.push('category = ?')
      params.push(f.category)
    }
    if (f.featured) {
      where.push('featured = ?')
      params.push(f.featured === 'true' ? 1 : 0)
    }
    const rows = await db.all(`SELECT * FROM projects WHERE ${where.join(' AND ')} ORDER BY featured DESC, created_at DESC LIMIT ?`, [...params, f.limit])
    return c.json({ projects: rows.map(project(config)) })
  },
)

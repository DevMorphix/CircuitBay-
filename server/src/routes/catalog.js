import { Hono } from 'hono'
import { z } from 'zod'
import { query } from '../middleware/validate.js'
import { cached } from '../middleware/cache.js'
import { notFound } from '../lib/errors.js'
import { product } from '../lib/serializers.js'

export const catalog = new Hono()

catalog.get('/categories', cached(300), async (c) => {
  const { db } = c.var.svc
  const rows = await db.all(
    `SELECT c.*, (SELECT COUNT(*) FROM products p WHERE p.category = c.slug AND p.active = 1) AS product_count
       FROM categories c ORDER BY sort_order, label`,
  )
  return c.json({
    categories: rows.map((r) => ({ slug: r.slug, label: r.label, icon: r.icon, blurb: r.blurb, productCount: r.product_count })),
  })
})

const csv = z
  .string()
  .optional()
  .transform((v) => (v ? v.split(',').map((s) => s.trim()).filter(Boolean) : []))
const flag = z
  .enum(['true', 'false', '1', '0'])
  .optional()
  .transform((v) => (v == null ? undefined : v === 'true' || v === '1'))

const SORTS = {
  popular: 'reviews_count DESC, name',
  'price-asc': 'price_paise ASC, name',
  'price-desc': 'price_paise DESC, name',
  rating: 'rating DESC, reviews_count DESC',
  newest: 'created_at DESC',
}

const listQuery = z.object({
  category: z.string().optional(),
  q: z.string().trim().max(100).optional(),
  level: csv,
  brand: csv,
  type: csv,
  minPrice: z.coerce.number().min(0).optional(), // rupees
  maxPrice: z.coerce.number().min(0).optional(),
  inStock: flag,
  kit: flag,
  ids: csv,
  sort: z.enum(Object.keys(SORTS)).default('popular'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(48).default(12),
})

// GET /products — filter, sort, paginate. Also returns facet values
// (brands, types, levels) for the current category/search so the filter
// sidebar can be built from real data.
catalog.get('/products', cached(60), query(listQuery), async (c) => {
  const { db, config } = c.var.svc
  const f = c.req.valid('query')

  // Base scope: category + search (facets are computed within this)
  const base = ['active = 1']
  const baseParams = []
  if (f.category && f.category !== 'all') {
    base.push('category = ?')
    baseParams.push(f.category)
  }
  if (f.q) {
    base.push(`(name LIKE ? ESCAPE '\\' OR for_what LIKE ? ESCAPE '\\' OR type LIKE ? ESCAPE '\\' OR brand LIKE ? ESCAPE '\\')`)
    const like = `%${f.q.replace(/[\\%_]/g, (m) => `\\${m}`)}%`
    baseParams.push(like, like, like, like)
  }

  const where = [...base]
  const params = [...baseParams]
  const inList = (col, values) => {
    if (!values.length) return
    where.push(`${col} IN (${values.map(() => '?').join(',')})`)
    params.push(...values)
  }
  inList('level', f.level)
  inList('brand', f.brand)
  inList('type', f.type)
  inList('id', f.ids)
  if (f.minPrice != null) {
    where.push('price_paise >= ?')
    params.push(Math.round(f.minPrice * 100))
  }
  if (f.maxPrice != null) {
    where.push('price_paise <= ?')
    params.push(Math.round(f.maxPrice * 100))
  }
  if (f.inStock) where.push('stock > 0')
  if (f.kit != null) {
    where.push('is_kit = ?')
    params.push(f.kit ? 1 : 0)
  }

  const whereSql = where.join(' AND ')
  const baseSql = base.join(' AND ')
  const [rows, [{ total }], facets] = await Promise.all([
    db.all(`SELECT * FROM products WHERE ${whereSql} ORDER BY ${SORTS[f.sort]} LIMIT ? OFFSET ?`, [
      ...params,
      f.limit,
      (f.page - 1) * f.limit,
    ]),
    db.all(`SELECT COUNT(*) AS total FROM products WHERE ${whereSql}`, params),
    db.all(
      `SELECT 'brand' AS facet, brand AS value, COUNT(*) AS n FROM products WHERE ${baseSql} AND brand IS NOT NULL GROUP BY brand
       UNION ALL SELECT 'type', type, COUNT(*) FROM products WHERE ${baseSql} AND type IS NOT NULL GROUP BY type
       UNION ALL SELECT 'level', level, COUNT(*) FROM products WHERE ${baseSql} AND level IS NOT NULL GROUP BY level`,
      [...baseParams, ...baseParams, ...baseParams],
    ),
  ])

  const facetMap = { brand: [], type: [], level: [] }
  for (const r of facets) facetMap[r.facet].push({ value: r.value, count: r.n })

  return c.json({
    products: rows.map(product(config)),
    page: f.page,
    limit: f.limit,
    total,
    pages: Math.max(1, Math.ceil(total / f.limit)),
    facets: facetMap,
  })
})

catalog.get('/products/:id', cached(60), async (c) => {
  const { db, config } = c.var.svc
  const row = await db.first('SELECT * FROM products WHERE id = ? AND active = 1', [c.req.param('id')])
  if (!row) throw notFound('Product not found.')
  const related = await db.all(
    'SELECT * FROM products WHERE category = ? AND id != ? AND active = 1 ORDER BY reviews_count DESC LIMIT 4',
    [row.category, row.id],
  )
  return c.json({ product: product(config)(row), related: related.map(product(config)) })
})

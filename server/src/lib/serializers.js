import { parseJson } from '../db/index.js'

// Public URL for a stored object: the R2 public domain when configured,
// otherwise this API's /media proxy.
export function mediaUrl(config, key) {
  if (!key) return null
  if (/^https?:\/\//.test(key)) return key
  return config.MEDIA_PUBLIC_URL ? `${config.MEDIA_PUBLIC_URL}/${key}` : `${config.API_PUBLIC_URL}/media/${key}`
}

// Shapes match the frontend's content files (prices in rupees) so the UI
// can switch from mock data to the API with minimal changes.
export const product = (config) => (p) => ({
  id: p.id,
  name: p.name,
  category: p.category,
  kit: Boolean(p.is_kit),
  level: p.level,
  price: p.price_paise / 100,
  pricePaise: p.price_paise,
  stock: p.stock,
  brand: p.brand,
  type: p.type,
  badges: parseJson(p.badges, []),
  forWhat: p.for_what,
  build: p.build,
  inside: parseJson(p.inside, []),
  specs: parseJson(p.specs, {}),
  images: parseJson(p.images, []).map((k) => mediaUrl(config, k)),
  datasheetUrl: mediaUrl(config, p.datasheet_key),
  rating: p.rating,
  reviews: p.reviews_count,
  active: Boolean(p.active),
})

export const article = (config, { withBody = false } = {}) => (a) => ({
  slug: a.slug,
  title: a.title,
  seoTitle: a.seo_title ?? undefined,
  category: a.category,
  excerpt: a.excerpt,
  readTime: a.read_time,
  author: a.author,
  date: a.published_at ? new Date(a.published_at).toISOString().slice(0, 10) : null,
  updated: a.updated_at ? new Date(a.updated_at).toISOString().slice(0, 10) : null,
  featured: Boolean(a.featured),
  cover: mediaUrl(config, a.cover_key),
  parts: parseJson(a.parts, []),
  relatedProjects: parseJson(a.related_projects, []),
  status: a.status,
  ...(withBody ? { body: parseJson(a.body, []) } : {}),
})

export const project = (config) => (p) => ({
  id: p.id,
  title: p.title,
  blurb: p.blurb,
  description: p.description,
  tags: parseJson(p.tags, []),
  builder: p.builder,
  category: p.category,
  image: mediaUrl(config, p.image_key),
  link: p.link,
  featured: Boolean(p.featured),
  status: p.status,
})

export const order = (o, items = [], events = []) => ({
  id: o.id,
  status: o.status,
  createdAt: o.created_at,
  paidAt: o.paid_at,
  contact: { name: o.contact_name, email: o.contact_email, phone: o.contact_phone },
  shippingAddress: { line1: o.ship_line1, line2: o.ship_line2, city: o.ship_city, state: o.ship_state, pin: o.ship_pin },
  shippingMethod: o.shipping_method,
  totals: {
    subtotal: o.subtotal_paise / 100,
    shipping: o.shipping_paise / 100,
    tax: o.tax_paise / 100,
    total: o.total_paise / 100,
    currency: o.currency,
  },
  courier: o.courier,
  trackingNumber: o.tracking_number,
  items: items.map((i) => ({ productId: i.product_id, name: i.name, unitPrice: i.unit_price_paise / 100, qty: i.qty })),
  events: events.map((e) => ({ status: e.status, note: e.note, at: e.created_at })),
})

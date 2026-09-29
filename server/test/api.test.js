import { describe, expect, it, beforeAll } from 'vitest'
import { setup, client } from './helpers.js'
import { hmacSha256Hex } from '../src/lib/crypto.js'
import { priceOrder } from '../src/lib/money.js'
import { createPaymentProvider } from '../src/services/payments.js'
import { HOLD_MINUTES } from '../src/services/orders.js'
import { runMaintenance } from '../src/services/maintenance.js'
import { loadConfig } from '../src/config.js'

const checkoutBody = (items = [{ productId: 'esp32-iot-starter', qty: 1 }]) => ({
  items,
  contact: { name: 'Test Builder', email: 'buyer@example.com', phone: '98765 43210' },
  address: { line1: '1 Test Street', city: 'Kochi', state: 'Kerala', pin: '682001' },
  shippingMethod: 'standard',
})

describe('health + catalog', () => {
  const { app } = setup()
  const api = client(app)

  it('reports health', async () => {
    const res = await api.get('/api/health')
    expect(res.status).toBe(200)
    expect(res.body).toMatchObject({ ok: true, db: 'sqlite', payments: 'fake' })
  })

  it('lists categories with counts', async () => {
    const res = await api.get('/api/categories')
    expect(res.body.categories.find((c) => c.slug === 'iot').productCount).toBeGreaterThan(0)
  })

  it('filters, sorts and paginates products with facets', async () => {
    const res = await api.get('/api/products?category=iot&sort=price-asc&limit=2')
    expect(res.status).toBe(200)
    expect(res.body.products).toHaveLength(2)
    expect(res.body.products[0].price).toBeLessThanOrEqual(res.body.products[1].price)
    expect(res.body.total).toBeGreaterThan(2)
    expect(res.body.facets.brand.length).toBeGreaterThan(0)
  })

  it('searches products (and escapes LIKE wildcards)', async () => {
    expect((await api.get('/api/products?category=all&q=esp32')).body.total).toBeGreaterThan(0)
    expect((await api.get('/api/products?q=%25')).body.total).toBe(0)
  })

  it('returns a product with related items, 404 for unknown', async () => {
    const res = await api.get('/api/products/esp32-devkit')
    expect(res.body.product).toMatchObject({ id: 'esp32-devkit', price: 449, pricePaise: 44900 })
    expect((await api.get('/api/products/nope')).status).toBe(404)
  })

  it('serves articles and projects', async () => {
    const list = await api.get('/api/articles?category=tutorials')
    expect(list.body.articles.length).toBeGreaterThan(0)
    const one = await api.get(`/api/articles/${list.body.articles[0].slug}`)
    expect(Array.isArray(one.body.article.body)).toBe(true)
    expect((await api.get('/api/projects')).body.projects.length).toBe(6)
  })
})

describe('auth: email + password', () => {
  const { app, svc } = setup()
  const api = client(app)

  it('registers, reads /me, logs out, logs back in', async () => {
    const reg = await api.post('/api/auth/register', { email: 'Maker@Example.com', password: 'correct horse', name: 'Maker' })
    expect(reg.status).toBe(201)
    expect(reg.body.user).toMatchObject({ email: 'maker@example.com', role: 'customer' })
    expect(reg.body.user.password_hash).toBeUndefined()

    expect((await api.get('/api/auth/me')).body.user.email).toBe('maker@example.com')
    await api.post('/api/auth/logout', {})
    expect((await api.get('/api/auth/me')).body.user).toBeNull()

    expect((await api.post('/api/auth/login', { email: 'maker@example.com', password: 'wrong pass' })).status).toBe(401)
    expect((await api.post('/api/auth/login', { email: 'maker@example.com', password: 'correct horse' })).status).toBe(200)
  })

  it('rejects duplicate emails and weak passwords', async () => {
    expect((await client(app).post('/api/auth/register', { email: 'maker@example.com', password: 'another one' })).status).toBe(409)
    const weak = await client(app).post('/api/auth/register', { email: 'x@example.com', password: 'short' })
    expect(weak.status).toBe(400)
    expect(weak.body.error.details[0].path).toBe('password')
  })

  it('grants admin to ADMIN_EMAILS', async () => {
    const res = await client(app).post('/api/auth/register', { email: 'admin@example.com', password: 'admin password' })
    expect(res.body.user.role).toBe('admin')
  })

  it('resets a forgotten password via emailed token', async () => {
    const res = await client(app).post('/api/auth/password/forgot', { email: 'maker@example.com' })
    expect(res.status).toBe(200)
    const mail = svc.email.sent.at(-1)
    const token = decodeURIComponent(mail.text.match(/token=([^\s]+)/)[1])
    const other = client(app)
    expect((await other.post('/api/auth/password/reset', { token, password: 'brand new pass' })).status).toBe(200)
    expect((await other.post('/api/auth/password/reset', { token, password: 'again again' })).status).toBe(400)
    expect((await client(app).post('/api/auth/login', { email: 'maker@example.com', password: 'brand new pass' })).status).toBe(200)
  })

  it('does not reveal whether an email exists', async () => {
    const res = await client(app).post('/api/auth/password/forgot', { email: 'nobody@example.com' })
    expect(res.status).toBe(200)
  })
})

describe('auth: phone OTP', () => {
  const { app, svc } = setup()

  it('signs up with a phone number and blocks brute force', async () => {
    const api = client(app)
    expect((await api.post('/api/auth/otp/request', { phone: '9876543210' })).status).toBe(200)
    const { phone, code } = svc.sms.sent.at(-1)
    expect(phone).toBe('+919876543210')

    const wrong = code === '000000' ? '111111' : '000000'
    expect((await api.post('/api/auth/otp/verify', { phone: '9876543210', code: wrong })).status).toBe(400)
    const ok = await api.post('/api/auth/otp/verify', { phone: '+91 98765 43210', code, name: 'Phone Maker' })
    expect(ok.status).toBe(200)
    expect(ok.body.user).toMatchObject({ phone: '+919876543210', phoneVerified: true })
    // Code is single-use
    expect((await client(app).post('/api/auth/otp/verify', { phone: '9876543210', code })).status).toBe(400)
  })

  it('locks a code after 5 wrong attempts', async () => {
    const api = client(app)
    await api.post('/api/auth/otp/request', { phone: '9123456789' })
    const { code } = svc.sms.sent.at(-1)
    const wrong = code === '000000' ? '111111' : '000000'
    for (let i = 0; i < 5; i++) await api.post('/api/auth/otp/verify', { phone: '9123456789', code: wrong })
    expect((await api.post('/api/auth/otp/verify', { phone: '9123456789', code })).status).toBe(400)
  })

  it('rejects invalid Indian numbers', async () => {
    expect((await client(app).post('/api/auth/otp/request', { phone: '12345' })).status).toBe(400)
  })
})

describe('checkout → payment → tracking', () => {
  const { app, svc, db } = setup()
  const api = client(app)
  let orderId, providerOrderId

  it('prices on the server, reserves stock and creates a pending order', async () => {
    const stockBefore = (await db.first('SELECT stock FROM products WHERE id = ?', ['esp32-iot-starter'])).stock
    const res = await api.post('/api/checkout', checkoutBody([
      { productId: 'esp32-iot-starter', qty: 1 },
      { productId: 'esp32-iot-starter', qty: 1 }, // merged into qty 2
    ]))
    expect(res.status).toBe(201)
    const expected = priceOrder(149900 * 2, 'standard')
    expect(res.body.totals.total).toBe(expected.total / 100)
    expect(res.body.payment).toMatchObject({ provider: 'fake', amount: expected.total, currency: 'INR' })
    orderId = res.body.orderId
    providerOrderId = res.body.payment.orderId
    expect((await db.first('SELECT status FROM orders WHERE id = ?', [orderId])).status).toBe('pending_payment')
    // Stock is held as soon as the order exists
    expect((await db.first('SELECT stock FROM products WHERE id = ?', ['esp32-iot-starter'])).stock).toBe(stockBefore - 2)
  })

  it('refuses out-of-stock quantities', async () => {
    const res = await api.post('/api/checkout', checkoutBody([{ productId: 'line-follower-kit', qty: 50 }]))
    expect(res.status).toBe(409)
    expect(res.body.error.details[0]).toMatchObject({ productId: 'line-follower-kit', available: 4 })
  })

  it('rejects a bad signature, accepts a good one, and payment does not touch stock again', async () => {
    const before = (await db.first('SELECT stock FROM products WHERE id = ?', ['esp32-iot-starter'])).stock
    const bad = await api.post('/api/checkout/verify', { orderId, razorpay_order_id: providerOrderId, razorpay_payment_id: 'pay_1', razorpay_signature: 'nope' })
    expect(bad.status).toBe(400)

    const good = { orderId, razorpay_order_id: providerOrderId, razorpay_payment_id: 'pay_1', razorpay_signature: 'fake-ok' }
    const ok = await api.post('/api/checkout/verify', good)
    expect(ok.status).toBe(200)
    expect(ok.body.order.status).toBe('placed')
    await api.post('/api/checkout/verify', good) // repeat is harmless
    const after = (await db.first('SELECT stock FROM products WHERE id = ?', ['esp32-iot-starter'])).stock
    expect(after).toBe(before)
    expect(svc.email.sent.at(-1).subject).toContain(orderId)
  })

  it('tracks by order id + email or phone, hides personal details', async () => {
    const byEmail = await api.get(`/api/orders/track?orderId=${orderId}&contact=BUYER@example.com`)
    expect(byEmail.status).toBe(200)
    expect(byEmail.body.order.status).toBe('placed')
    expect(byEmail.body.order.contact).toBeUndefined()
    expect(byEmail.body.steps[0]).toBe('placed')
    expect((await api.get(`/api/orders/track?orderId=${orderId}&contact=9876543210`)).status).toBe(200)
    expect((await api.get(`/api/orders/track?orderId=${orderId}&contact=someone@else.com`)).status).toBe(404)
  })
})

describe('Razorpay signatures + webhook', () => {
  const env = { APP_ENV: 'test', PAYMENTS_PROVIDER: 'razorpay', RAZORPAY_KEY_ID: 'rzp_test_x', RAZORPAY_KEY_SECRET: 'key_secret', RAZORPAY_WEBHOOK_SECRET: 'hook_secret' }

  it('verifies checkout signatures the way Razorpay documents', async () => {
    const rp = createPaymentProvider(loadConfig(env))
    const signature = await hmacSha256Hex('key_secret', 'order_ABC|pay_XYZ')
    expect(await rp.verifyPayment({ orderId: 'order_ABC', paymentId: 'pay_XYZ', signature })).toBe(true)
    expect(await rp.verifyPayment({ orderId: 'order_ABC', paymentId: 'pay_OTHER', signature })).toBe(false)
  })

  it('marks an order paid from a signed webhook, once, and checks the amount', async () => {
    const { app, db } = setup(env)
    const now = Date.now()
    await db.run(
      `INSERT INTO orders (id, status, contact_name, contact_email, contact_phone, ship_line1, ship_city, ship_state, ship_pin,
         shipping_method, subtotal_paise, shipping_paise, tax_paise, total_paise, payment_provider, payment_order_id, created_at, updated_at)
       VALUES ('CBTEST0001', 'pending_payment', 'A', 'a@example.com', '+919876543210', 'x', 'y', 'z', '682001',
         'standard', 44900, 7900, 8082, 60882, 'razorpay', 'order_WH1', ?, ?)`,
      [now, now],
    )
    await db.run(`INSERT INTO order_items (order_id, product_id, name, unit_price_paise, qty) VALUES ('CBTEST0001', 'esp32-devkit', 'ESP32 DevKit V1', 44900, 1)`)

    const send = async (payload, eventId) => {
      const raw = JSON.stringify(payload)
      return app.request('/api/webhooks/razorpay', {
        method: 'POST',
        body: raw,
        headers: { 'content-type': 'application/json', 'x-razorpay-signature': await hmacSha256Hex('hook_secret', raw), 'x-razorpay-event-id': eventId },
      })
    }
    const captured = (amount) => ({ event: 'payment.captured', payload: { payment: { entity: { id: 'pay_WH1', order_id: 'order_WH1', amount } } } })

    // Wrong amount is ignored
    await send(captured(100), 'evt_0')
    expect((await db.first(`SELECT status FROM orders WHERE id = 'CBTEST0001'`)).status).toBe('pending_payment')

    expect((await send(captured(60882), 'evt_1')).status).toBe(200)
    expect((await db.first(`SELECT status, payment_id FROM orders WHERE id = 'CBTEST0001'`))).toMatchObject({ status: 'placed', payment_id: 'pay_WH1' })
    const dup = await (await send(captured(60882), 'evt_1')).json()
    expect(dup.duplicate).toBe(true)

    // Tampered body → 401
    const res = await app.request('/api/webhooks/razorpay', {
      method: 'POST',
      body: JSON.stringify(captured(60882)),
      headers: { 'content-type': 'application/json', 'x-razorpay-signature': 'bad' },
    })
    expect(res.status).toBe(401)
  })
})

describe('account', () => {
  const { app } = setup()
  const api = client(app)

  beforeAll(async () => {
    await api.post('/api/auth/register', { email: 'acct@example.com', password: 'password123' })
  })

  it('requires sign-in', async () => {
    expect((await client(app).get('/api/me/addresses')).status).toBe(401)
  })

  it('manages addresses with a single default', async () => {
    const a = { name: 'Home', phone: '9876543210', line1: '1 Street', city: 'Kochi', state: 'Kerala', pin: '682001' }
    const first = await api.post('/api/me/addresses', a)
    expect(first.body.address.isDefault).toBe(true)
    await api.post('/api/me/addresses', { ...a, label: 'Office', isDefault: true })
    const list = (await api.get('/api/me/addresses')).body.addresses
    expect(list.filter((x) => x.isDefault)).toHaveLength(1)
    expect(list[0].label).toBe('Office')
    expect((await api.del(`/api/me/addresses/${first.body.address.id}`)).status).toBe(200)
  })

  it('manages the wishlist', async () => {
    await api.put('/api/me/wishlist/esp32-cam', {})
    await api.put('/api/me/wishlist/esp32-cam', {})
    expect((await api.get('/api/me/wishlist')).body.products.map((p) => p.id)).toEqual(['esp32-cam'])
    await api.del('/api/me/wishlist/esp32-cam')
    expect((await api.get('/api/me/wishlist')).body.products).toEqual([])
  })

  it('lists own orders only', async () => {
    const co = await api.post('/api/checkout', checkoutBody())
    await api.post('/api/checkout/verify', { orderId: co.body.orderId, razorpay_order_id: co.body.payment.orderId, razorpay_payment_id: 'pay_test', razorpay_signature: 'fake-ok' })
    expect((await api.get('/api/me/orders')).body.orders.map((o) => o.id)).toEqual([co.body.orderId])
    expect((await client(app).get(`/api/me/orders/${co.body.orderId}`)).status).toBe(401)
  })
})

describe('forms', () => {
  const { app, db } = setup()
  const api = client(app)

  it('stores contact, workshop, newsletter and project submissions', async () => {
    expect((await api.post('/api/forms/contact', { name: 'A', email: 'a@example.com', role: 'Student', message: 'Need a sensor' })).status).toBe(201)
    expect((await api.post('/api/forms/workshop-requests', { institution: 'GHSS', contactName: 'T', email: 't@example.com', phone: '9876543210', studentCount: 60 })).status).toBe(201)
    expect((await api.post('/api/forms/newsletter', { email: 'n@example.com', source: 'footer' })).status).toBe(201)
    expect((await api.post('/api/forms/newsletter', { email: 'N@example.com' })).status).toBe(201) // idempotent
    expect((await api.post('/api/forms/project-submissions', { title: 'Plant bot', email: 'p@example.com' })).status).toBe(201)
    expect((await db.first('SELECT COUNT(*) AS n FROM newsletter_subscribers')).n).toBe(1)
    expect((await db.first(`SELECT status FROM projects WHERE title = 'Plant bot'`)).status).toBe('pending')
  })

  it('rejects the honeypot', async () => {
    expect((await api.post('/api/forms/newsletter', { email: 'bot@example.com', website: 'spam.com' })).status).toBe(400)
  })

  it('rate-limits', async () => {
    const other = client(app)
    let last
    for (let i = 0; i < 12; i++) last = await other.post('/api/forms/newsletter', { email: `r${i}@example.com` }, { 'cf-connecting-ip': '203.0.113.9' })
    expect(last.status).toBe(429)
  })
})

describe('security guards', () => {
  const { app } = setup()

  it('rejects non-JSON writes (CSRF) and foreign origins', async () => {
    const form = await app.request('/api/forms/contact', { method: 'POST', body: 'name=a', headers: { 'content-type': 'application/x-www-form-urlencoded' } })
    expect(form.status).toBe(415)
    const foreign = await app.request('/api/auth/login', { method: 'POST', body: '{}', headers: { 'content-type': 'application/json', origin: 'https://evil.example' } })
    expect(foreign.status).toBe(403)
  })

  it('answers CORS preflight for the dev frontend', async () => {
    const res = await app.request('/api/auth/login', { method: 'OPTIONS', headers: { origin: 'http://localhost:5173', 'access-control-request-method': 'POST' } })
    expect(res.headers.get('access-control-allow-origin')).toBe('http://localhost:5173')
    expect(res.headers.get('access-control-allow-credentials')).toBe('true')
  })

  it('sets httpOnly session cookies', async () => {
    const res = await client(app).post('/api/auth/register', { email: 'c@example.com', password: 'password123' })
    expect(res.headers.get('set-cookie')).toMatch(/HttpOnly/i)
  })

  it('returns JSON 404s', async () => {
    expect((await app.request('/api/nope')).status).toBe(404)
  })
})

describe('admin', () => {
  const { app, svc } = setup()
  const admin = client(app)
  const customer = client(app)

  beforeAll(async () => {
    await admin.post('/api/auth/register', { email: 'admin@example.com', password: 'admin password' })
    await customer.post('/api/auth/register', { email: 'cust@example.com', password: 'cust password' })
  })

  it('is admin-only', async () => {
    expect((await customer.get('/api/admin/stats')).status).toBe(403)
    expect((await client(app).get('/api/admin/stats')).status).toBe(401)
    expect((await admin.get('/api/admin/stats')).status).toBe(200)
  })

  it('creates, updates and soft-deletes products', async () => {
    const p = { id: 'test-kit', name: 'Test Kit', category: 'learning-kits', kit: true, level: 'Beginner', price: 999.5, stock: 3 }
    const created = await admin.post('/api/admin/products', p)
    expect(created.status).toBe(201)
    expect(created.body.product.pricePaise).toBe(99950)
    expect((await admin.post('/api/admin/products', p)).status).toBe(409)
    const { id, ...rest } = p
    await admin.put(`/api/admin/products/${id}`, { ...rest, price: 1099 })
    expect((await customer.get('/api/products/test-kit')).body.product.price).toBe(1099)
    await admin.del('/api/admin/products/test-kit')
    expect((await customer.get('/api/products/test-kit')).status).toBe(404)
  })

  it('advances order status and emails the customer', async () => {
    const co = await customer.post('/api/checkout', checkoutBody())
    await customer.post('/api/checkout/verify', { orderId: co.body.orderId, razorpay_order_id: co.body.payment.orderId, razorpay_payment_id: 'pay_test', razorpay_signature: 'fake-ok' })
    const res = await admin.post(`/api/admin/orders/${co.body.orderId}/status`, { status: 'shipped', courier: 'Delhivery', trackingNumber: 'DL123' })
    expect(res.status).toBe(200)
    expect(svc.email.sent.at(-1).subject).toContain('shipped')
    const track = await customer.get(`/api/orders/track?orderId=${co.body.orderId}&contact=buyer@example.com`)
    expect(track.body.order).toMatchObject({ status: 'shipped', courier: 'Delhivery', trackingNumber: 'DL123' })
  })

  it('cancels a paid order (restocking it) and tracks the refund', async () => {
    const co = await customer.post('/api/checkout', checkoutBody([{ productId: 'hc-sr04', qty: 2 }]))
    await customer.post('/api/checkout/verify', { orderId: co.body.orderId, razorpay_order_id: co.body.payment.orderId, razorpay_payment_id: 'pay_refund', razorpay_signature: 'fake-ok' })
    const stockBefore = (await customer.get('/api/stock?ids=hc-sr04')).body.stock['hc-sr04']

    expect((await admin.post(`/api/admin/orders/${co.body.orderId}/refunded`, {})).status).toBe(400) // not cancelled yet
    await admin.post(`/api/admin/orders/${co.body.orderId}/status`, { status: 'cancelled', notifyCustomer: false })
    expect((await customer.get('/api/stock?ids=hc-sr04')).body.stock['hc-sr04']).toBe(stockBefore + 2)
    expect((await admin.get('/api/admin/stats')).body.inbox.refundsNeeded).toBeGreaterThanOrEqual(1)

    expect((await admin.post(`/api/admin/orders/${co.body.orderId}/refunded`, { note: 'rfnd_123' })).status).toBe(200)
    expect((await admin.post(`/api/admin/orders/${co.body.orderId}/refunded`, {})).status).toBe(409)
    const detail = (await admin.get(`/api/admin/orders/${co.body.orderId}`)).body.order
    expect(detail.refundNote).toBe('rfnd_123')
    expect(detail.events.map((e) => e.status)).toContain('refunded')
    expect((await admin.get('/api/admin/stats')).body.inbox.refundsNeeded).toBe(0)
  })

  it('uploads to storage and serves it back via /media', async () => {
    const form = new FormData()
    form.set('file', new File([new Uint8Array([137, 80, 78, 71])], 'kit.png', { type: 'image/png' }))
    form.set('folder', 'products')
    const up = await admin.post('/api/admin/uploads', form)
    expect(up.status).toBe(201)
    expect(up.body.key).toMatch(/^products\/\d{4}\/\d{2}\/[a-z0-9]+\.png$/)
    const media = await app.request(`/media/${up.body.key}`)
    expect(media.status).toBe(200)
    expect(media.headers.get('content-type')).toBe('image/png')

    const bad = new FormData()
    bad.set('file', new File(['<html>'], 'x.html', { type: 'text/html' }))
    expect((await admin.post('/api/admin/uploads', bad)).status).toBe(400)
    expect((await customer.post('/api/admin/uploads', form)).status).toBe(403)
  })

  it('edits articles with list and table blocks and loads them back for the editor', async () => {
    const body = [
      { type: 'h2', id: 'intro', text: 'Intro' },
      { type: 'list', items: ['one', 'two'] },
      { type: 'table', head: ['a', 'b'], rows: [['1', '2']] },
    ]
    const saved = await admin.put('/api/admin/articles/test-post', { title: 'Test post', category: 'tutorials', body, status: 'draft' })
    expect(saved.status).toBe(200)
    const loaded = await admin.get('/api/admin/articles/test-post')
    expect(loaded.body.article.body).toEqual(body)
    expect(loaded.body.article.status).toBe('draft')
    expect((await customer.get('/api/articles/test-post')).status).toBe(404) // drafts stay private
    expect((await admin.put('/api/admin/articles/bad', { title: 'Bad', category: 'x', body: [{ type: 'list', items: [] }] })).status).toBe(400)
  })

  it('accepts exactly what the admin article editor sends, and round-trips it', async () => {
    const { toEditable, fromEditable, slugify } = await import('../../src/pages/admin/format.js')
    // What a person types into the editor
    const typed = [
      { type: 'p', text: 'The INA219 measures bus voltage and current.' },
      { type: 'h2', text: 'Wiring it up' },
      { type: 'list', text: 'Up to 26 V bus voltage\n\n I2C interface ' },
      { type: 'table', text: 'Spec | Value\nBus voltage | 0–26 V\nInterface | I2C' },
      { type: 'code', text: 'Wire.begin();' },
    ]
    const body = typed.filter((b) => b.text?.trim()).map(fromEditable)
    const slug = slugify('INA219 current sensor: a quick guide')
    expect(slug).toBe('ina219-current-sensor-a-quick-guide')
    const res = await admin.put(`/api/admin/articles/${slug}`, { title: 'INA219 current sensor: a quick guide', category: 'tutorials', body, status: 'published' })
    expect(res.status).toBe(200)
    const loaded = (await admin.get(`/api/admin/articles/${slug}`)).body.article.body
    expect(loaded[1]).toEqual({ type: 'h2', id: 'wiring-it-up', text: 'Wiring it up' })
    expect(loaded[2]).toEqual({ type: 'list', items: ['Up to 26 V bus voltage', 'I2C interface'] })
    expect(loaded[3]).toEqual({ type: 'table', head: ['Spec', 'Value'], rows: [['Bus voltage', '0–26 V'], ['Interface', 'I2C']] })
    // Loading it back into the editor gives the same text a person would edit
    expect(loaded.map(toEditable)[3].text).toBe('Spec | Value\nBus voltage | 0–26 V\nInterface | I2C')
    expect((await customer.get(`/api/articles/${slug}`)).status).toBe(200)
  })

  it('explains when site publishing is not configured', async () => {
    const res = await admin.post('/api/admin/site/rebuild', {})
    expect(res.status).toBe(501)
    expect(res.body.error.message).toMatch(/SITE_DEPLOY_HOOK_URL/)
    expect((await customer.post('/api/admin/site/rebuild', {})).status).toBe(403)
  })

  it('returns raw image keys to the product editor', async () => {
    const list = await admin.get('/api/admin/products?q=esp32-devkit')
    expect(list.body.products[0]).toMatchObject({ id: 'esp32-devkit', imageKeys: [], datasheetKey: null })
  })

  it('moderates project submissions', async () => {
    await customer.post('/api/forms/project-submissions', { title: 'Moderate me', email: 'm@example.com' })
    const pending = (await admin.get('/api/admin/projects?status=pending')).body.projects
    await admin.patch(`/api/admin/projects/${pending[0].id}`, { status: 'published', blurb: 'Approved' })
    expect((await customer.get('/api/projects')).body.projects.some((p) => p.title === 'Moderate me')).toBe(true)
  })
})

describe('stock under concurrency', () => {
  it('never oversells when many shoppers check out the last units at once', async () => {
    const { app, db } = setup()
    // line-follower-kit has 4 in stock; 10 shoppers each try to buy 1, simultaneously
    const results = await Promise.all(
      Array.from({ length: 10 }, (_, i) =>
        client(app).post('/api/checkout', checkoutBody([{ productId: 'line-follower-kit', qty: 1 }]), { 'cf-connecting-ip': `198.51.100.${i}` }),
      ),
    )
    expect(results.filter((r) => r.status === 201)).toHaveLength(4)
    expect(results.filter((r) => r.status === 409)).toHaveLength(6)
    expect((await db.first(`SELECT stock FROM products WHERE id = 'line-follower-kit'`)).stock).toBe(0)
  })

  it('releases unpaid holds after the hold window, and re-reserves on a late payment', async () => {
    const { app, db } = setup()
    const api = client(app)
    const co = await api.post('/api/checkout', checkoutBody([{ productId: 'line-follower-kit', qty: 4 }]))
    expect((await db.first(`SELECT stock FROM products WHERE id = 'line-follower-kit'`)).stock).toBe(0)

    const later = Date.now() + (HOLD_MINUTES + 1) * 60_000
    expect((await runMaintenance(db, later)).released).toBe(1)
    expect((await db.first(`SELECT stock FROM products WHERE id = 'line-follower-kit'`)).stock).toBe(4)
    expect((await db.first('SELECT status FROM orders WHERE id = ?', [co.body.orderId])).status).toBe('cancelled')
    expect((await runMaintenance(db, later)).released).toBe(0) // idempotent

    // Customer finishes paying anyway: stock is still there, so it's placed
    const paid = await api.post('/api/checkout/verify', { orderId: co.body.orderId, razorpay_order_id: co.body.payment.orderId, razorpay_payment_id: 'pay_late', razorpay_signature: 'fake-ok' })
    expect(paid.body.order.status).toBe('placed')
    expect((await db.first(`SELECT stock FROM products WHERE id = 'line-follower-kit'`)).stock).toBe(0)
  })

  it('flags a refund when a late payment arrives after the stock is gone', async () => {
    const { app, db } = setup()
    const late = client(app)
    const co = await late.post('/api/checkout', checkoutBody([{ productId: 'line-follower-kit', qty: 4 }]))
    await runMaintenance(db, Date.now() + (HOLD_MINUTES + 1) * 60_000)
    await client(app).post('/api/checkout', checkoutBody([{ productId: 'line-follower-kit', qty: 4 }]), { 'cf-connecting-ip': '198.51.100.99' })

    const paid = await late.post('/api/checkout/verify', { orderId: co.body.orderId, razorpay_order_id: co.body.payment.orderId, razorpay_payment_id: 'pay_x', razorpay_signature: 'fake-ok' })
    expect(paid.body.order.status).toBe('cancelled')
    const events = await db.all('SELECT status FROM order_events WHERE order_id = ?', [co.body.orderId])
    expect(events.map((e) => e.status)).toContain('needs_refund')
    expect((await db.first(`SELECT stock FROM products WHERE id = 'line-follower-kit'`)).stock).toBe(0)
  })

  it('gives stock back when the payment gateway is down', async () => {
    const { app, db, svc } = setup()
    svc.payments.createOrder = async () => {
      throw new Error('gateway timeout')
    }
    const res = await client(app).post('/api/checkout', checkoutBody([{ productId: 'line-follower-kit', qty: 2 }]))
    expect(res.status).toBe(502)
    expect((await db.first(`SELECT stock FROM products WHERE id = 'line-follower-kit'`)).stock).toBe(4)
  })
})

describe('GST invoices', () => {
  const SELLER = { BUSINESS_GSTIN: '32ABCDE1234F1Z5', BUSINESS_STATE_CODE: '32', BUSINESS_LEGAL_NAME: 'CircuitBay Test Pvt Ltd' }
  const pay = (api, co) =>
    api.post('/api/checkout/verify', { orderId: co.body.orderId, razorpay_order_id: co.body.payment.orderId, razorpay_payment_id: `pay_${co.body.orderId}`, razorpay_signature: 'fake-ok' })
  const html = async (res) => (typeof res.body === 'string' ? res.body : JSON.stringify(res.body))

  it('formats amounts in words and financial years the Indian way', async () => {
    const { amountInWords, financialYear } = await import('../src/lib/money.js')
    expect(amountInWords(12345678_50)).toBe('Rupees One Crore Twenty-Three Lakh Forty-Five Thousand Six Hundred Seventy-Eight and Paise Fifty Only')
    expect(amountInWords(100)).toBe('Rupees One Only')
    expect(financialYear(Date.parse('2026-03-31T12:00:00+05:30'))).toBe('25-26')
    expect(financialYear(Date.parse('2026-04-01T00:30:00+05:30'))).toBe('26-27')
  })

  it('issues sequential invoice numbers on payment, with CGST+SGST for same-state delivery', async () => {
    const { app, db } = setup(SELLER)
    const api = client(app)
    const first = await api.post('/api/checkout', checkoutBody()) // Kerala → same state as the seller
    expect((await api.post('/api/orders/invoice', { orderId: first.body.orderId, contact: 'buyer@example.com' })).status).toBe(404) // not paid yet
    await pay(api, first)
    const second = await api.post('/api/checkout', { ...checkoutBody(), address: { ...checkoutBody().address, state: 'Karnataka' } })
    await pay(api, second)

    const nos = await db.all('SELECT id, invoice_no, place_of_supply FROM orders ORDER BY invoiced_at, invoice_no')
    const fy = (await import('../src/lib/money.js')).financialYear()
    expect(nos.map((o) => o.invoice_no)).toEqual([`CB/${fy}/000001`, `CB/${fy}/000002`])
    expect(nos.map((o) => o.place_of_supply)).toEqual(['32', '29'])
    expect(nos[0].invoice_no.length).toBeLessThanOrEqual(16)

    const intra = await html(await api.post('/api/orders/invoice', { orderId: first.body.orderId, contact: '98765 43210' }))
    expect(intra).toContain('Tax Invoice')
    expect(intra).toContain('32ABCDE1234F1Z5')
    expect(intra).toContain('CGST')
    expect(intra).not.toContain('>IGST<')
    expect(intra).toContain('Place of supply: <strong>Kerala (32)</strong>')

    const inter = await html(await api.post('/api/orders/invoice', { orderId: second.body.orderId, contact: 'buyer@example.com' }))
    expect(inter).toContain('>IGST<')
    expect(inter).toContain('Karnataka (29)')
    // Pay once more for the same order: no second number is consumed
    await pay(api, first)
    expect((await db.first('SELECT last FROM invoice_counters')).last).toBe(2)
  })

  it('charges GST per product rate and prints matching totals', async () => {
    const { app, db } = setup(SELLER)
    await db.run(`UPDATE products SET gst_rate = 5, hsn_code = '85437099' WHERE id = 'hc-sr04'`)
    const api = client(app)
    const co = await api.post('/api/checkout', checkoutBody([{ productId: 'hc-sr04', qty: 2 }, { productId: 'esp32-devkit', qty: 1 }]))
    // hc-sr04: ₹99 × 2 at 5% = 9.90; esp32: ₹449 at 18% = 80.82
    expect(co.body.totals.tax).toBeCloseTo(90.72, 2)
    await pay(api, co)
    const inv = await html(await api.post('/api/orders/invoice', { orderId: co.body.orderId, contact: 'buyer@example.com' }))
    expect(inv).toContain('85437099')
    expect(inv).toContain(`₹${(co.body.totals.total).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`)
  })

  it('only gives the invoice to the buyer, the account owner and admins', async () => {
    const { app } = setup({ ...SELLER, ADMIN_EMAILS: 'admin@example.com' })
    const owner = client(app)
    await owner.post('/api/auth/register', { email: 'owner@example.com', password: 'password123' })
    const co = await owner.post('/api/checkout', checkoutBody())
    await pay(owner, co)

    expect((await owner.get(`/api/me/orders/${co.body.orderId}/invoice`)).status).toBe(200)
    const stranger = client(app)
    await stranger.post('/api/auth/register', { email: 'stranger@example.com', password: 'password123' })
    expect((await stranger.get(`/api/me/orders/${co.body.orderId}/invoice`)).status).toBe(404)
    expect((await stranger.post('/api/orders/invoice', { orderId: co.body.orderId, contact: 'stranger@example.com' })).status).toBe(404)
    const admin = client(app)
    await admin.post('/api/auth/register', { email: 'admin@example.com', password: 'admin password' })
    expect((await admin.get(`/api/admin/orders/${co.body.orderId}/invoice`)).status).toBe(200)
    expect((await owner.get('/api/me/orders')).body.orders[0].invoiceNo).toMatch(/^CB\/\d{2}-\d{2}\/\d{6}$/)
  })

  it('rejects delivery states that are not Indian states/UTs', async () => {
    const { app } = setup()
    const res = await client(app).post('/api/checkout', { ...checkoutBody(), address: { ...checkoutBody().address, state: 'Atlantis' } })
    expect(res.status).toBe(400)
    expect(res.body.error.details[0].path).toBe('address.state')
  })
})

describe('refunds through the payment provider', () => {
  const insertCancelledPaid = (db, id, paymentId = 'pay_R1') => {
    const now = Date.now()
    return db.run(
      `INSERT INTO orders (id, status, contact_name, contact_email, contact_phone, ship_line1, ship_city, ship_state, ship_pin,
         shipping_method, subtotal_paise, shipping_paise, tax_paise, total_paise, payment_provider, payment_order_id, payment_id, paid_at, created_at, updated_at)
       VALUES (?, 'cancelled', 'R', 'r@example.com', '+919876543210', 'x', 'Kochi', 'Kerala', '682001', 'standard', 10000, 7900, 1800, 19700, 'razorpay', ?, ?, ?, ?, ?)`,
      [id, `order_${id}`, paymentId, now, now, now],
    )
  }
  const adminFor = async (app) => {
    const admin = client(app)
    await admin.post('/api/auth/register', { email: 'admin@example.com', password: 'admin password' })
    return admin
  }

  it('refunds a cancelled order once, emails the customer, and clears "refunds needed"', async () => {
    const { app, db, svc } = setup()
    await insertCancelledPaid(db, 'CBREFUND01')
    const admin = await adminFor(app)
    expect((await admin.get('/api/admin/stats')).body.inbox.refundsNeeded).toBe(1)

    const res = await admin.post('/api/admin/orders/CBREFUND01/refund', { reason: 'Customer changed mind' })
    expect(res.status).toBe(200)
    expect(res.body.refundId).toMatch(/^rfnd_fake_/)
    expect(svc.email.sent.at(-1)).toMatchObject({ to: 'r@example.com', subject: 'Refund for order CBREFUND01' })
    expect((await admin.post('/api/admin/orders/CBREFUND01/refund', {})).status).toBe(409)
    expect((await admin.get('/api/admin/stats')).body.inbox.refundsNeeded).toBe(0)
    const detail = (await admin.get('/api/admin/orders/CBREFUND01')).body.order
    expect(detail.refundNote).toBe(res.body.refundId)
  })

  it('refuses to refund an order that is not cancelled', async () => {
    const { app } = setup()
    const admin = await adminFor(app)
    const co = await admin.post('/api/checkout', checkoutBody())
    await admin.post('/api/checkout/verify', { orderId: co.body.orderId, razorpay_order_id: co.body.payment.orderId, razorpay_payment_id: 'pay_live1', razorpay_signature: 'fake-ok' })
    expect((await admin.post(`/api/admin/orders/${co.body.orderId}/refund`, {})).status).toBe(400)
  })

  it('calls Razorpay with the full amount, and releases the claim if Razorpay rejects it', async () => {
    const env = { APP_ENV: 'test', PAYMENTS_PROVIDER: 'razorpay', RAZORPAY_KEY_ID: 'rzp_test_x', RAZORPAY_KEY_SECRET: 'key_secret', RAZORPAY_WEBHOOK_SECRET: 'hook_secret' }
    const { app, db } = setup(env)
    await insertCancelledPaid(db, 'CBREFUND02', 'pay_ABC')
    const admin = await adminFor(app)
    const calls = []
    const realFetch = globalThis.fetch
    let fail = true
    globalThis.fetch = async (url, init) => {
      calls.push({ url: String(url), body: JSON.parse(init.body), auth: init.headers.Authorization })
      return fail
        ? new Response(JSON.stringify({ error: { description: 'The balance is insufficient' } }), { status: 400 })
        : new Response(JSON.stringify({ id: 'rfnd_REAL1', status: 'processed' }), { status: 200 })
    }
    try {
      const rejected = await admin.post('/api/admin/orders/CBREFUND02/refund', {})
      expect(rejected.status).toBe(502)
      expect(rejected.body.error.message).toContain('The balance is insufficient')
      expect((await db.first(`SELECT refunded_at FROM orders WHERE id = 'CBREFUND02'`)).refunded_at).toBeNull()

      fail = false
      const ok = await admin.post('/api/admin/orders/CBREFUND02/refund', {})
      expect(ok.body.refundId).toBe('rfnd_REAL1')
      expect(calls[1]).toMatchObject({ url: 'https://api.razorpay.com/v1/payments/pay_ABC/refund', body: { amount: 19700, speed: 'normal' } })
      expect(calls[1].auth).toBe(`Basic ${btoa('rzp_test_x:key_secret')}`)
    } finally {
      globalThis.fetch = realFetch
    }
  })

  it('reopens "refunds needed" when Razorpay reports a refund failed', async () => {
    const env = { APP_ENV: 'test', PAYMENTS_PROVIDER: 'razorpay', RAZORPAY_KEY_ID: 'rzp_test_x', RAZORPAY_KEY_SECRET: 'key_secret', RAZORPAY_WEBHOOK_SECRET: 'hook_secret' }
    const { app, db } = setup(env)
    await insertCancelledPaid(db, 'CBREFUND03', 'pay_XYZ')
    await db.run(`UPDATE orders SET refunded_at = ?, refund_note = 'rfnd_X' WHERE id = 'CBREFUND03'`, [Date.now()])
    const raw = JSON.stringify({ event: 'refund.failed', payload: { refund: { entity: { id: 'rfnd_X', payment_id: 'pay_XYZ', amount: 19700 } } } })
    const res = await app.request('/api/webhooks/razorpay', {
      method: 'POST',
      body: raw,
      headers: { 'content-type': 'application/json', 'x-razorpay-signature': await hmacSha256Hex('hook_secret', raw), 'x-razorpay-event-id': 'evt_rf1' },
    })
    expect(res.status).toBe(200)
    const o = await db.first(`SELECT refunded_at, refund_note FROM orders WHERE id = 'CBREFUND03'`)
    expect(o).toMatchObject({ refunded_at: null, refund_note: 'failed: rfnd_X' })
  })
})

describe('site publishing', () => {
  it('calls the deploy hook when configured', async () => {
    const calls = []
    const realFetch = globalThis.fetch
    globalThis.fetch = async (url, init) => {
      calls.push({ url: String(url), method: init?.method })
      return new Response('{"success":true}', { status: 200 })
    }
    try {
      const { app } = setup({ SITE_DEPLOY_HOOK_URL: 'https://api.cloudflare.com/client/v4/pages/webhooks/deploy_hooks/test' })
      const admin = client(app)
      await admin.post('/api/auth/register', { email: 'admin@example.com', password: 'admin password' })
      const res = await admin.post('/api/admin/site/rebuild', {})
      expect(res.status).toBe(200)
      expect(calls).toEqual([{ url: 'https://api.cloudflare.com/client/v4/pages/webhooks/deploy_hooks/test', method: 'POST' }])
    } finally {
      globalThis.fetch = realFetch
    }
  })
})

describe('catalog for the site build', () => {
  it('lists every product kits-first by default, with the fields the pages need', async () => {
    const { app } = setup()
    const res = await client(app).get('/api/products?category=all&limit=48')
    expect(res.body.total).toBe(17)
    expect(res.body.products.slice(0, 4).every((p) => p.kit)).toBe(true)
    expect(Object.keys(res.body.products[0])).toEqual(expect.arrayContaining(['id', 'name', 'price', 'stock', 'badges', 'specs', 'images', 'inside']))
  })

  it('returns article SEO titles and body for prerendering', async () => {
    const { app } = setup()
    const a = (await client(app).get('/api/articles/which-sensor-for-obstacle-detection')).body.article
    expect(a.seoTitle).toBe('Ultrasonic vs IR vs ToF: Obstacle Sensors Compared')
    expect(a.body.some((b) => b.type === 'table')).toBe(true)
    // Drafts are not published
    expect((await client(app).get('/api/articles/airloo-build-log')).status).toBe(404)
  })
})

describe('response cache', () => {
  it('serves repeat catalog reads from cache and refreshes after admin edits', async () => {
    const { app } = setup()
    const admin = client(app)
    await admin.post('/api/auth/register', { email: 'admin@example.com', password: 'admin password' })

    const first = await client(app).get('/api/products/esp32-devkit')
    expect(first.headers.get('x-cache')).toBe('MISS')
    const second = await client(app).get('/api/products/esp32-devkit')
    expect(second.headers.get('x-cache')).toBe('HIT')
    expect(second.headers.get('cache-control')).toMatch(/public/)
    expect(second.body).toEqual(first.body)

    const { id, ...p } = first.body.product
    await admin.put(`/api/admin/products/${id}`, { ...p, datasheetKey: null, images: [], price: 499 })
    const third = await client(app).get('/api/products/esp32-devkit')
    expect(third.headers.get('x-cache')).toBe('MISS')
    expect(third.body.product.price).toBe(499)
  })

  it('serves live, uncached stock even while product data is cached', async () => {
    const { app, db } = setup()
    const api = client(app)
    await api.get('/api/products/line-follower-kit') // warm the cache
    await db.run(`UPDATE products SET stock = 1 WHERE id = 'line-follower-kit'`)
    expect((await api.get('/api/products/line-follower-kit')).body.product.stock).toBe(4) // cached
    const live = await api.get('/api/stock?ids=line-follower-kit,esp32-devkit,nope')
    expect(live.headers.get('cache-control')).toBe('no-store')
    expect(live.body.stock).toEqual({ 'line-follower-kit': 1, 'esp32-devkit': 120 })
  })

  it('keeps CORS headers on cached responses', async () => {
    const { app } = setup()
    await app.request('/api/categories', { headers: { origin: 'http://localhost:5173' } })
    const hit = await app.request('/api/categories', { headers: { origin: 'http://localhost:5173' } })
    expect(hit.headers.get('x-cache')).toBe('HIT')
    expect(hit.headers.get('access-control-allow-origin')).toBe('http://localhost:5173')
  })
})

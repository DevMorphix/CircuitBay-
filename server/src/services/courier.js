import { randomId, timingSafeEqual } from '../lib/crypto.js'

// Courier provider interface:
//   name                          'shiprocket' | 'fake' | null (manual)
//   book({ order, items, weightGrams, box })
//        -> { courierOrderId, shipmentId, awb, courier, labelUrl, trackingUrl }
//   track(awb)       -> { status, at } | null   (courier's latest status text)
//   cancel(order)    -> void (best effort)
//   verifyWebhook(c) -> boolean
// With COURIER_PROVIDER=manual there is no provider: the team types the
// courier and AWB into the admin as before.
// `db` caches Shiprocket's login token (service_tokens).
export function createCourier(config, { db, fetchImpl = (...a) => fetch(...a) } = {}) {
  if (config.COURIER_PROVIDER === 'shiprocket') return shiprocket(config, db, fetchImpl)
  if (config.COURIER_PROVIDER === 'fake') return fake()
  return null
}

// The customer-facing order status a courier status moves the order to,
// or null (no change: pickup pending, delays, returns — logged only).
export function mapCourierStatus(text) {
  const s = String(text ?? '').toUpperCase().trim()
  if (!s || s.startsWith('RTO') || /RETURN|UNDELIVERED|LOST|DAMAGED|CANCEL/.test(s)) return null
  if (s === 'DELIVERED') return 'delivered'
  if (s === 'OUT FOR DELIVERY') return 'out_for_delivery'
  if (/PICKED UP|SHIPPED|IN TRANSIT|REACHED|HUB|DISPATCHED|MISROUTED/.test(s)) return 'shipped'
  return null
}

// Courier statuses the team should look at (shown as issues in the admin)
export const isCourierProblem = (text) => /^RTO|RETURN|UNDELIVERED|LOST|DAMAGED/i.test(String(text ?? '').trim())

// ------------------------------------------------------------ shiprocket --
// https://apidocs.shiprocket.in — token login (valid 10 days, cached in
// service_tokens), adhoc order → assign AWB → schedule pickup → label.
const SR = 'https://apiv2.shiprocket.in/v1/external'
const TOKEN_TTL_MS = 9 * 86_400_000

function shiprocket(config, db, fetchImpl) {
  async function token(force = false) {
    const now = Date.now()
    if (!force && db) {
      const row = await db.first(`SELECT token FROM service_tokens WHERE name = 'shiprocket' AND expires_at > ?`, [now])
      if (row) return row.token
    }
    const res = await fetchImpl(`${SR}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: config.SHIPROCKET_EMAIL, password: config.SHIPROCKET_PASSWORD }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok || !data.token) throw new Error(`Shiprocket login failed: HTTP ${res.status}`)
    if (db) {
      await db.run(
        `INSERT INTO service_tokens (name, token, expires_at) VALUES ('shiprocket', ?, ?)
         ON CONFLICT(name) DO UPDATE SET token = excluded.token, expires_at = excluded.expires_at`,
        [data.token, now + TOKEN_TTL_MS],
      )
    }
    return data.token
  }

  // JSON call with the cached token; logs in again once if it has expired
  async function call(method, path, body, retry = true) {
    const res = await fetchImpl(`${SR}${path}`, {
      method,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await token(!retry)}` },
      ...(body ? { body: JSON.stringify(body) } : {}),
    })
    if (res.status === 401 && retry) return call(method, path, body, false)
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(`Shiprocket ${path} failed: HTTP ${res.status} ${data.message ?? ''}`.trim())
    return data
  }

  return {
    name: 'shiprocket',

    async book({ order: o, items, weightGrams, box }) {
      const [length, breadth, height] = box
      const ist = new Date((o.paid_at ?? o.created_at) + 5.5 * 3_600_000).toISOString()
      const [first, ...rest] = o.contact_name.trim().split(/\s+/)
      const created = await call('POST', '/orders/create/adhoc', {
        order_id: o.id,
        order_date: `${ist.slice(0, 10)} ${ist.slice(11, 16)}`,
        pickup_location: config.SHIPROCKET_PICKUP_LOCATION,
        billing_customer_name: first,
        billing_last_name: rest.join(' '),
        billing_address: o.ship_line1,
        billing_address_2: o.ship_line2 ?? '',
        billing_city: o.ship_city,
        billing_pincode: o.ship_pin,
        billing_state: o.ship_state,
        billing_country: 'India',
        billing_email: o.contact_email,
        billing_phone: o.contact_phone.replace(/\D/g, '').slice(-10),
        shipping_is_billing: true,
        // Prices incl. GST, after any coupon discount (what the customer paid)
        order_items: items.map((i) => ({
          name: i.name,
          sku: i.product_id,
          units: i.qty,
          selling_price: ((i.unit_price_paise * i.qty - (i.discount_paise ?? 0) + (i.tax_paise ?? 0)) / i.qty / 100).toFixed(2),
          tax: i.gst_rate ?? 18,
          hsn: i.hsn_code ?? '',
        })),
        payment_method: 'Prepaid',
        shipping_charges: o.shipping_paise / 100,
        sub_total: (o.total_paise - o.shipping_paise) / 100,
        length,
        breadth,
        height,
        weight: Math.max(0.05, weightGrams / 1000),
      })
      const shipmentId = created.shipment_id
      if (!shipmentId) throw new Error(`Shiprocket did not create a shipment: ${created.message ?? JSON.stringify(created).slice(0, 200)}`)

      // Cheapest recommended courier is chosen by Shiprocket
      const awbRes = await call('POST', '/courier/assign/awb', { shipment_id: shipmentId })
      const awbData = awbRes.response?.data ?? {}
      if (!awbData.awb_code) throw new Error(`Shiprocket could not assign an AWB: ${awbRes.message ?? 'no courier available for this PIN code'}`)

      // Pickup and label are best effort — both can be retried in Shiprocket
      await call('POST', '/courier/generate/pickup', { shipment_id: [shipmentId] }).catch((err) => console.error('shiprocket pickup', o.id, err))
      const label = await call('POST', '/courier/generate/label', { shipment_id: [shipmentId] }).catch(() => ({}))

      return {
        courierOrderId: String(created.order_id),
        shipmentId: String(shipmentId),
        awb: String(awbData.awb_code),
        courier: awbData.courier_name ?? 'Shiprocket',
        labelUrl: label.label_url ?? null,
        trackingUrl: `https://shiprocket.co/tracking/${encodeURIComponent(awbData.awb_code)}`,
      }
    },

    async track(awb) {
      const data = await call('GET', `/courier/track/awb/${encodeURIComponent(awb)}`)
      const t = data.tracking_data ?? {}
      const latest = t.shipment_track?.[0]
      const status = latest?.current_status ?? t.shipment_track_activities?.[0]?.['sr-status-label']
      return status ? { status, at: Date.parse(latest?.updated_time ?? '') || Date.now() } : null
    },

    async cancel(o) {
      if (o.courier_order_id) await call('POST', '/orders/cancel', { ids: [Number(o.courier_order_id)] })
    },

    // Shiprocket sends the token configured on its webhook as `x-api-key`
    verifyWebhook: (c) => timingSafeEqual(c.req.header('x-api-key') ?? '', config.SHIPROCKET_WEBHOOK_TOKEN ?? '\u0000'),
  }
}

// ------------------------------------------------------------------ fake --
// Local development: books instantly, and tracking moves along by itself
// every 2 minutes after booking (picked up → in transit → out for
// delivery → delivered), driven by the maintenance job.
export const FAKE_STEP_MS = 2 * 60_000
const FAKE_STEPS = ['PICKUP SCHEDULED', 'PICKED UP', 'IN TRANSIT', 'OUT FOR DELIVERY', 'DELIVERED']

function fake() {
  return {
    name: 'fake',
    async book({ order }) {
      // FAKE<booking time, base 36>-<random>, so tracking can tell how long ago it was booked
      const awb = `FAKE${Date.now().toString(36).toUpperCase()}-${randomId(4).toUpperCase()}`
      return { courierOrderId: `fake_${order.id}`, shipmentId: `fake_${randomId(6)}`, awb, courier: 'Test Courier', labelUrl: null, trackingUrl: null }
    },
    async track(awb, now = Date.now()) {
      const booked = parseInt(awb.slice(4).split('-')[0], 36)
      if (!booked) return null
      const step = Math.min(FAKE_STEPS.length - 1, Math.floor((now - booked) / FAKE_STEP_MS))
      return { status: FAKE_STEPS[step], at: now }
    },
    async cancel() {},
    verifyWebhook: (c) => c.req.header('x-api-key') === 'fake-courier-token',
  }
}

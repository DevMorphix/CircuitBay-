import { expect, request as playwrightRequest } from '@playwright/test'

export const ADMIN = { email: 'admin@e2e.test', password: 'admin e2e password', name: 'Admin Tester' }
export const PRODUCT = { id: 'esp32-iot-starter', name: 'ESP32 IoT Starter Kit' }

// Unique email per test run (the database is fresh each run, but retries reuse it)
export const uniqueEmail = (who) => `${who}.${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}@e2e.test`

// A signed-in API client (own cookie jar) for setting up data quickly
export async function apiAs(baseURL, { email, password, name }, { register = true } = {}) {
  const ctx = await playwrightRequest.newContext({ baseURL })
  const res = register ? await ctx.post('/api/auth/register', { data: { email, password, name } }) : null
  if (!res || res.status() === 409) {
    const login = await ctx.post('/api/auth/login', { data: { email, password } })
    expect(login.ok(), `login ${email}`).toBeTruthy()
  } else {
    expect(res.ok(), `register ${email}: ${res.status()}`).toBeTruthy()
  }
  return ctx
}

export async function signIn(page, { email, password }) {
  await page.goto('/login')
  await page.getByLabel('Email', { exact: true }).fill(email)
  await page.getByLabel('Password', { exact: true }).fill(password)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await page.waitForURL(/\/account|\/admin/)
}

export const checkoutBody = (email, items = [{ productId: PRODUCT.id, qty: 1 }]) => ({
  items,
  contact: { name: 'Asha Builder', email, phone: '98765 43210' },
  address: { line1: '12 Maker Street', city: 'Kochi', state: 'Kerala', pin: '682001' },
  shippingMethod: 'standard',
})

// Places and pays an order through the API (fake payments), as `ctx`'s user
export async function placePaidOrder(ctx, email) {
  const co = await (await ctx.post('/api/checkout', { data: checkoutBody(email) })).json()
  const paid = await ctx.post('/api/checkout/verify', {
    data: { orderId: co.orderId, razorpay_order_id: co.payment.orderId, razorpay_payment_id: `pay_e2e_${co.orderId}`, razorpay_signature: 'fake-ok' },
  })
  expect(paid.ok()).toBeTruthy()
  return co.orderId
}

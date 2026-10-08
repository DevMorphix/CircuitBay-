import { expect, test } from '@playwright/test'
import { ADMIN, PRODUCT, apiAs, uniqueEmail } from './helpers.js'

test('guest: product → cart → coupon → checkout → confirmation → tracking', async ({ page, baseURL }) => {
  // A coupon for this run: ₹100 off
  const admin = await apiAs(baseURL, ADMIN)
  const code = `E2E${Date.now().toString(36).toUpperCase()}`
  expect((await admin.post('/api/admin/coupons', { data: { code, kind: 'amount', value: 100 } })).ok()).toBeTruthy()

  await page.goto(`/shop/product/${PRODUCT.id}`)
  await expect(page.getByRole('heading', { level: 1, name: PRODUCT.name })).toBeVisible()
  await page.getByRole('button', { name: 'Add to cart' }).first().click()
  await expect(page.getByRole('link', { name: /Cart, 1 item/ }).first()).toBeVisible()

  await page.goto('/shop/cart')
  await expect(page.getByText(PRODUCT.name).first()).toBeVisible()

  // A wrong code explains itself; the right one shows the discount
  await page.getByLabel('Coupon code').fill('NOT-A-CODE')
  await page.getByRole('button', { name: 'Apply' }).click()
  await expect(page.getByText(`"NOT-A-CODE" isn't a valid coupon code.`)).toBeVisible()
  await page.getByLabel('Coupon code').fill(code.toLowerCase())
  await page.getByRole('button', { name: 'Apply' }).click()
  await expect(page.getByText(`Coupon ${code}`)).toBeVisible()
  await expect(page.getByText('−₹100')).toBeVisible()

  await page.getByRole('link', { name: 'Proceed to checkout' }).click()
  await expect(page).toHaveURL(/\/shop\/checkout/)
  const email = uniqueEmail('guest')
  await page.getByLabel('Full name').fill('Guest Builder')
  await page.getByLabel('Mobile number').fill('98765 43210')
  await page.getByLabel('Email', { exact: true }).fill(email)
  await page.getByLabel('Address', { exact: true }).fill('7 Circuit Lane')
  await page.getByLabel('City').fill('Kochi')
  await page.getByLabel('PIN code').fill('682001')
  await page.getByLabel('State').selectOption('Kerala')
  await page.getByRole('button', { name: 'Continue to shipping' }).click()
  await page.getByRole('button', { name: 'Continue to payment' }).click()
  // Coupon carried through to checkout
  await expect(page.getByText(`Coupon ${code}`)).toBeVisible()
  await page.getByRole('button', { name: /^Pay/ }).click()

  await page.waitForURL(/\/shop\/order\//)
  await expect(page.getByRole('heading', { name: "It's on its way to your bench." })).toBeVisible()
  const orderId = page.url().split('/shop/order/')[1].split(/[?#]/)[0]
  await expect(page.getByRole('link', { name: /Cart, 0 items/ }).first()).toBeVisible() // cart emptied

  await page.goto('/shop/track')
  await page.getByLabel('Order ID').fill(orderId)
  await page.getByLabel('Phone or email').fill(email)
  await page.getByRole('button', { name: 'Track' }).click()
  await expect(page.getByText(`#${orderId}`)).toBeVisible()
  await expect(page.getByRole('list', { name: 'Order status' })).toBeVisible()
  await expect(page.getByRole('button', { name: /GST invoice/ })).toBeVisible()
})

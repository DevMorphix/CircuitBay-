import { expect, test } from '@playwright/test'
import { ADMIN, PRODUCT, apiAs, placePaidOrder, signIn, uniqueEmail } from './helpers.js'

test('order → courier booking → delivered → verified review → approved → on the product page', async ({ page, browser, baseURL }) => {
  await apiAs(baseURL, ADMIN) // make sure the admin account exists
  const customer = { email: uniqueEmail('reviewer'), password: 'reviewer password', name: 'Ravi Kumar' }
  const customerApi = await apiAs(baseURL, customer)
  const orderId = await placePaidOrder(customerApi, customer.email)
  const reviewText = `Solid kit — had the Wi-Fi thermometer running in an evening (${orderId}).`

  // Admin: book the courier, then mark the order delivered
  await signIn(page, ADMIN)
  await page.goto(`/admin/orders/${orderId}`)
  await page.getByRole('button', { name: 'Book shipment' }).click()
  await expect(page.getByText(/^FAKE/)).toBeVisible()
  await expect(page.getByText('Test Courier').first()).toBeVisible()
  await expect(page.getByText('Shipment booked with Test Courier', { exact: false })).toBeVisible()

  await page.getByLabel('Move to').selectOption('delivered')
  await page.getByRole('button', { name: 'Mark as delivered' }).click()
  await expect.poll(async () => (await (await customerApi.get(`/api/me/orders/${orderId}`)).json()).order.status).toBe('delivered')

  // Customer: write the review from My account
  const customerPage = await (await browser.newContext()).newPage()
  await signIn(customerPage, customer)
  await customerPage.goto('/account?tab=reviews')
  await customerPage.getByRole('button', { name: 'Write a review' }).click()
  await customerPage.locator('label[title="Excellent"]').click()
  await customerPage.getByLabel('Headline (optional)').fill('Great first IoT kit')
  await customerPage.getByLabel('Your review').fill(reviewText)
  await customerPage.getByRole('button', { name: 'Submit review' }).click()
  await expect(customerPage.getByText('Waiting for approval')).toBeVisible()

  // Admin: approve it with a reply
  await page.goto('/admin/reviews')
  const row = page.getByRole('listitem').filter({ hasText: reviewText })
  await row.getByLabel(/Public reply to/).fill('Thanks, Ravi!')
  await row.getByRole('button', { name: 'Approve' }).click()
  await expect(page.getByText(reviewText)).toHaveCount(0) // left the "To approve" list

  // Public product page shows it as a verified review
  const visitor = await (await browser.newContext()).newPage()
  await visitor.goto(`/shop/product/${PRODUCT.id}`)
  await visitor.getByRole('tab', { name: 'Reviews' }).click()
  await expect(visitor.getByText(reviewText)).toBeVisible()
  await expect(visitor.getByText('Ravi K.', { exact: false })).toBeVisible()
  await expect(visitor.getByText('Verified buyer').first()).toBeVisible()
  await expect(visitor.getByText('Thanks, Ravi!')).toBeVisible()
})

test('articles are written in Markdown with a live preview', async ({ page, baseURL }) => {
  await apiAs(baseURL, ADMIN)
  await signIn(page, ADMIN)
  await page.goto('/admin/articles/new')
  const title = `E2E article ${Date.now().toString(36)}`
  await page.getByLabel('Title (the headline on the page)').fill(title)
  await page.getByLabel('Article body in Markdown').fill('## Wiring it up\n\nConnect **VCC** to 3V3 and read [the guide](/blog).\n\n1. Plug in\n2. Upload')
  await page.getByRole('tab', { name: 'preview' }).click()
  await expect(page.getByRole('heading', { name: 'Wiring it up' })).toBeVisible()
  await expect(page.locator('strong', { hasText: 'VCC' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'the guide' })).toBeVisible()

  await page.getByRole('button', { name: 'Save' }).click()
  await expect(page.getByText('Draft saved.')).toBeVisible()
  await expect(page).toHaveURL(/\/admin\/articles\/e2e-article-/)

  // Reloading shows the same Markdown
  await page.reload()
  await expect(page.getByLabel('Article body in Markdown')).toHaveValue(/## Wiring it up[\s\S]*1\. Plug in/)
})

test('non-admins are kept out of the admin', async ({ page, baseURL }) => {
  const someone = { email: uniqueEmail('someone'), password: 'someone password', name: 'Some One' }
  await apiAs(baseURL, someone)
  await signIn(page, someone)
  await page.goto('/admin')
  await expect(page.getByRole('heading', { name: 'No access' })).toBeVisible()
})

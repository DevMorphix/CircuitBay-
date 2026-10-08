import { expect, test } from '@playwright/test'
import { uniqueEmail } from './helpers.js'

test('register, see the account, sign out, and sign back in', async ({ page }) => {
  const email = uniqueEmail('asha')
  const password = 'correct horse battery'

  await page.goto('/register')
  await page.getByLabel('Name').fill('Asha Builder')
  await page.getByLabel('Email', { exact: true }).fill(email)
  await page.getByLabel('Password (8+ characters)').fill(password)
  await page.getByRole('button', { name: 'Create account' }).click()

  await expect(page).toHaveURL(/\/account/)
  await expect(page.getByRole('heading', { name: 'Welcome back, Asha.' })).toBeVisible()
  // New accounts are asked to confirm their email
  await expect(page.getByText('Confirm your email.')).toBeVisible()
  await page.getByRole('button', { name: 'Resend the link' }).click()
  await expect(page.getByText('New link sent')).toBeVisible()

  await page.getByRole('button', { name: 'Sign out' }).click()
  await page.goto('/account')
  await expect(page).toHaveURL(/\/login/)

  await page.getByLabel('Email', { exact: true }).fill(email)
  await page.getByLabel('Password', { exact: true }).fill('wrong password')
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page.getByText('Email or password is incorrect.')).toBeVisible()

  await page.getByLabel('Password', { exact: true }).fill(password)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page.getByRole('heading', { name: 'Welcome back, Asha.' })).toBeVisible()
})

test('private pages send signed-out visitors to sign in', async ({ page }) => {
  await page.goto('/admin/orders')
  await expect(page).toHaveURL(/\/login\?next=%2Fadmin%2Forders/)
})

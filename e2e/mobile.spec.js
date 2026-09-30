import { expect, test } from '@playwright/test'
import { PRODUCT } from './helpers.js'

// Phone-sized screen: menu, no sideways scrolling, add to cart
test('mobile: menu works, pages fit the screen, and the cart updates', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Open menu' }).first().click()
  const nav = page.getByRole('navigation', { name: 'Mobile' })
  await expect(nav).toBeVisible()
  await nav.getByRole('link', { name: 'Shop' }).click()
  await expect(page).toHaveURL(/\/shop/)

  for (const path of ['/', '/shop', `/shop/product/${PRODUCT.id}`, '/blog', '/shop/cart']) {
    await page.goto(path)
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
    expect(overflow, `${path} scrolls sideways`).toBeLessThanOrEqual(1)
  }

  await page.goto(`/shop/product/${PRODUCT.id}`)
  await page.getByRole('button', { name: 'Add to cart' }).first().click()
  await expect(page.getByRole('link', { name: /Cart, 1 item/ }).first()).toBeVisible()
})

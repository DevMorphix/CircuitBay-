import { expect, test } from '@playwright/test'
import { PRODUCT } from './helpers.js'

// Phone-sized screen: menu, no sideways scrolling, add to cart
test('mobile: menu works, pages fit the screen, and the cart updates', async ({ page }) => {
  await page.goto('/')
  // Touch screens use native snapping on the story reel's chapters…
  await expect(page.locator('html')).toHaveClass(/home-snap/)
  expect(await page.evaluate(() => getComputedStyle(document.documentElement).scrollSnapType)).toBe('y mandatory')
  // …a link from the reel to a section isn't snapped back to it…
  await page.locator('#top a[href="#who-we-are"]').evaluate((a) => a.click())
  await expect(page.getByRole('heading', { name: 'A bay for people who build.' })).toBeInViewport()
  await expect(page.locator('html')).not.toHaveClass(/home-snap/)
  // …and below the reel the page can rest anywhere, the footer included
  const bottom = await page.evaluate(async () => {
    const max = document.documentElement.scrollHeight - window.innerHeight
    window.scrollTo({ top: max, behavior: 'instant' })
    await new Promise((r) => setTimeout(r, 600))
    return { y: Math.round(window.scrollY), max }
  })
  expect(bottom.y).toBeGreaterThanOrEqual(bottom.max - 2)
  await expect(page.getByRole('contentinfo')).toBeInViewport()
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

import { expect, test } from '@playwright/test'

// Home page checkpoint scrolling (src/hooks/useCheckpointScroll.js)

const scrollY = (page) => page.evaluate(() => Math.round(window.scrollY))

// Waits until the page has stopped moving, then returns where it is
async function settled(page) {
  await page.waitForTimeout(150) // let a glide start
  let last = -1
  for (let i = 0; i < 40; i++) {
    const y = await scrollY(page)
    if (y === last) return y
    last = y
    await page.waitForTimeout(120)
  }
  return last
}

const checkpoints = (page) =>
  page.evaluate(() => {
    const max = document.documentElement.scrollHeight - window.innerHeight
    const ys = [...document.querySelectorAll('[data-checkpoint]')].map((el) => {
      const margin = parseFloat(getComputedStyle(el).scrollMarginTop) || 0
      return Math.round(el.getBoundingClientRect().top + window.scrollY - margin)
    })
    return [...new Set([...ys, max].map((y) => Math.max(0, Math.min(y, max))))].sort((a, b) => a - b)
  })

test('a small wheel scroll glides to the next checkpoint, not a few pixels', async ({ page }) => {
  await page.goto('/')
  await page.waitForLoadState('networkidle')
  const points = await checkpoints(page)
  expect(points.length).toBeGreaterThan(8) // 5 reel chapters + sections + footer

  await page.mouse.move(640, 400)
  await page.mouse.wheel(0, 40)
  expect(Math.abs((await settled(page)) - points[1])).toBeLessThanOrEqual(2)

  // …and a small wheel back up returns to the top
  await page.mouse.wheel(0, -40)
  expect(await settled(page)).toBeLessThanOrEqual(2)
})

test('a trackpad flick (a burst of small wheel events with momentum) moves exactly one step', async ({ page }) => {
  await page.goto('/')
  await page.waitForLoadState('networkidle')
  const points = await checkpoints(page)
  await page.mouse.move(640, 400)
  // ~1.2 s of events every 16 ms, fading out like trackpad momentum
  for (let i = 0; i < 75; i++) {
    await page.mouse.wheel(0, Math.max(1, 60 - i))
    await page.waitForTimeout(16)
  }
  expect(Math.abs((await settled(page)) - points[1])).toBeLessThanOrEqual(2)

  // A separate flick after a pause moves one more step
  await page.waitForTimeout(400)
  for (let i = 0; i < 20; i++) {
    await page.mouse.wheel(0, 30)
    await page.waitForTimeout(16)
  }
  expect(Math.abs((await settled(page)) - points[2])).toBeLessThanOrEqual(2)
})

test('keyboard steps through every checkpoint to the footer and back, skipping nothing', async ({ page }) => {
  await page.goto('/')
  await page.waitForLoadState('networkidle')
  const points = await checkpoints(page)
  const viewport = page.viewportSize().height
  // The story reel's chapters are scrub distance apart (may exceed a screen)
  const reelEnd = await page.evaluate(() => {
    const reel = document.getElementById('top')
    return reel.offsetTop + reel.offsetHeight - window.innerHeight
  })

  const visited = [await settled(page)]
  for (let i = 0; i < 80 && visited.at(-1) < points.at(-1) - 2; i++) {
    await page.keyboard.press('PageDown')
    const y = await settled(page)
    expect(y, `step ${i}`).toBeGreaterThan(visited.at(-1))
    // After the reel, no step moves more than a screen: tall sections are read, not skipped
    if (visited.at(-1) >= reelEnd - 2) expect(y - visited.at(-1), `step ${i} jumped too far`).toBeLessThanOrEqual(viewport * 1.06)
    visited.push(y)
  }
  expect(visited.at(-1)).toBeGreaterThanOrEqual(points.at(-1) - 2) // reached the footer
  // Every checkpoint was a stop on the way down
  for (const p of points) expect(visited.some((y) => Math.abs(y - p) <= 2), `checkpoint ${p}`).toBeTruthy()
  await expect(page.getByRole('contentinfo')).toBeInViewport()

  await page.keyboard.press('PageUp')
  expect(await settled(page)).toBeLessThan(visited.at(-1))
})

test('each story-reel stop shows exactly one chapter, fully visible', async ({ page }) => {
  await page.goto('/')
  await page.waitForLoadState('networkidle')
  const visibleChapters = () =>
    page.evaluate(() =>
      [...document.querySelectorAll('#top .absolute.inset-x-0.top-0.flex')].map((el) => Number(getComputedStyle(el).opacity)).filter((o) => o > 0.01),
    )
  // 5 chapter stops, then the reel's last frame
  for (let stop = 0; stop < 6; stop++) {
    const opacities = await visibleChapters()
    expect(opacities, `stop ${stop}`).toEqual([1])
    await page.keyboard.press('PageDown')
    await settled(page)
  }
})

test('the story reel stops on its last frame before moving on', async ({ page }) => {
  await page.goto('/')
  await page.waitForLoadState('networkidle')
  const lastFrame = await page.evaluate(() => {
    const reel = document.getElementById('top')
    return reel.offsetTop + reel.offsetHeight - window.innerHeight
  })
  let y = 0
  for (let i = 0; i < 5; i++) {
    await page.keyboard.press('PageDown')
    y = await settled(page)
  }
  expect(Math.abs(y - lastFrame)).toBeLessThanOrEqual(2) // 6th stop = last frame
  await page.keyboard.press('PageDown')
  await settled(page)
  await expect(page.getByRole('heading', { name: 'A bay for people who build.' })).toBeInViewport()
})

test('other pages scroll normally', async ({ page }) => {
  await page.goto('/about')
  await page.waitForLoadState('networkidle')
  await page.mouse.move(640, 400)
  await page.mouse.wheel(0, 40)
  const y = await settled(page)
  expect(y).toBeGreaterThan(20)
  expect(y).toBeLessThan(80)
})

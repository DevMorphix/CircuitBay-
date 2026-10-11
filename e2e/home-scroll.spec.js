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

// The story reel's stops (its top, each later chapter, its last frame)
const checkpoints = (page) =>
  page.evaluate(() => {
    const max = document.documentElement.scrollHeight - window.innerHeight
    const ys = [...document.querySelectorAll('[data-checkpoint="step"]')].map((el) => Math.round(el.getBoundingClientRect().top + window.scrollY))
    return [...new Set(ys.map((y) => Math.max(0, Math.min(y, max))))].sort((a, b) => a - b)
  })

test('a small wheel scroll glides to the next checkpoint, not a few pixels', async ({ page }) => {
  await page.goto('/')
  await page.waitForLoadState('networkidle')
  const points = await checkpoints(page)
  expect(points).toHaveLength(6) // reel top, 4 later chapters, last frame

  await page.mouse.move(640, 400)
  await page.mouse.wheel(0, 40)
  expect(Math.abs((await settled(page)) - points[1])).toBeLessThanOrEqual(2)

  // …and a small wheel back up returns to the top
  await page.mouse.wheel(0, -40)
  expect(await settled(page)).toBeLessThanOrEqual(2)
})

test('single wheel ticks step through the reel, then the page scrolls normally', async ({ page }) => {
  await page.goto('/')
  await page.waitForLoadState('networkidle')
  const points = await checkpoints(page)
  const lastFrame = points.at(-1)
  await page.mouse.move(640, 300)

  // Pauses between ticks: right after a glide, same-way stragglers are ignored (momentum)
  const tick = async (dy) => {
    await page.waitForTimeout(400)
    await page.mouse.wheel(0, dy)
    return settled(page)
  }

  // Inside the reel every tick lands on the next chapter
  let y = await settled(page)
  for (const p of points.slice(1)) {
    y = await tick(40)
    expect(Math.abs(y - p), `stop ${p}`).toBeLessThanOrEqual(2)
  }
  expect(y).toBe(lastFrame)

  // After it, a tick scrolls a tick's worth: no jumping between sections
  for (let i = 0; i < 3; i++) {
    const next = await tick(40)
    expect(next - y, `tick ${i} after the reel`).toBeGreaterThan(20)
    expect(next - y, `tick ${i} after the reel`).toBeLessThan(80)
    y = next
  }

  // Back up past the last frame: chapter stepping resumes
  await page.evaluate((top) => window.scrollTo({ top, behavior: 'instant' }), lastFrame + 30)
  await tick(-40)
  y = await tick(-40)
  expect(Math.abs(y - points.at(-2))).toBeLessThanOrEqual(2)
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

test('keyboard steps through the reel, then pages normally to the footer and back', async ({ page }) => {
  await page.goto('/')
  await page.waitForLoadState('networkidle')
  const points = await checkpoints(page)
  const viewport = page.viewportSize().height
  const max = await page.evaluate(() => document.documentElement.scrollHeight - window.innerHeight)

  const visited = [await settled(page)]
  for (let i = 0; i < 80 && visited.at(-1) < max - 2; i++) {
    await page.keyboard.press('PageDown')
    const y = await settled(page)
    expect(y, `step ${i}`).toBeGreaterThan(visited.at(-1))
    // After the reel, PageDown is the browser's own (under a screen)
    if (visited.at(-1) >= points.at(-1) - 2) expect(y - visited.at(-1), `step ${i} jumped too far`).toBeLessThanOrEqual(viewport)
    visited.push(y)
  }
  expect(visited.at(-1)).toBeGreaterThanOrEqual(max - 2) // reached the footer
  // Every reel chapter was a stop on the way down
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

// Every scroll-linked element in view (upper part of the screen): its opacity
const revealsInView = (page, sectionId) =>
  page.evaluate((id) => {
    const vh = window.innerHeight
    return [...document.querySelectorAll(`#${id} [style*="opacity"]`)]
      .map((el) => ({ top: el.getBoundingClientRect().top, opacity: Number(getComputedStyle(el).opacity) }))
      .filter((r) => r.top > 0 && r.top < vh * 0.65)
      .map((r) => r.opacity)
  }, sectionId)

test('section content animates in with the scroll, and rewinds when scrolling back', async ({ page }) => {
  await page.goto('/')
  await page.waitForLoadState('networkidle')
  const who = page.locator('#who-we-are h2').locator('xpath=ancestor::div[contains(@style,"opacity")][1]')
  await expect(who).toHaveCSS('opacity', '0') // still below the fold

  for (let i = 0; i < 6; i++) {
    await page.keyboard.press('PageDown')
    await settled(page)
  }
  // At the "Who we are" stop everything in view is fully in place
  await expect(page.getByRole('heading', { name: 'A bay for people who build.' })).toBeInViewport()
  const shown = await revealsInView(page, 'who-we-are')
  expect(shown.length).toBeGreaterThan(0)
  for (const o of shown) expect(o).toBeGreaterThan(0.98)

  // Back up to the reel's last frame: the section's content has rewound
  await page.keyboard.press('PageUp')
  await settled(page)
  expect(Number(await who.evaluate((el) => getComputedStyle(el).opacity))).toBeLessThan(0.5)

  // Every section stop shows its content fully (nothing left half-faded)
  for (const id of ['who-we-are', 'beliefs', 'students', 'educators', 'projects', 'learn', 'start']) {
    await page.locator(`#${id}`).evaluate((el) => window.scrollTo({ top: el.offsetTop - 80, behavior: 'instant' }))
    await page.waitForTimeout(250)
    for (const o of await revealsInView(page, id)) expect(o, `#${id}`).toBeGreaterThan(0.98)
  }
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

import { useEffect } from 'react'
import { useReducedMotion } from './useReducedMotion.js'

// Home page story-reel stepping: inside the opening reel, a small scroll
// moves to the next chapter (each one marked `data-checkpoint="step"`,
// ending on the reel's last frame) instead of scrubbing freely. Everything
// after the reel scrolls normally; its sections still animate with the scroll.
//
//  - Mouse wheel / trackpad / keyboard: a smooth glide to the next or
//    previous chapter. Trackpad momentum after a glide is swallowed so one
//    flick moves one step. Past the reel's last frame: native scrolling.
//  - Touch screens: native CSS snapping (`html.home-snap`, mandatory) on
//    the same stops, switched on only while the page is within the reel, so
//    it never pulls the page back up from the sections below.
//  - Off entirely with prefers-reduced-motion.

const THRESHOLD = 12 // px of wheel movement before a step starts
const MOMENTUM_GAP_MS = 220 // wheel events closer than this are one gesture
const COOLDOWN_MS = 350 // after a glide, stragglers from the same flick (same direction) are ignored
const EDGE = 4 // px tolerance

// The reel's stops (scroll positions), top to bottom; the last is its last frame
function reelStops() {
  const max = document.documentElement.scrollHeight - window.innerHeight
  const ys = [...document.querySelectorAll('[data-checkpoint="step"]')].map((el) =>
    Math.max(0, Math.min(Math.round(el.getBoundingClientRect().top + window.scrollY), max)),
  )
  return [...new Set(ys)].sort((a, b) => a - b)
}

// Where one step in `dir` (1 = down, -1 = up) should go, or null to let the
// browser scroll natively (below the reel, or at its very top)
function stepTarget(dir) {
  const y = window.scrollY
  const stops = reelStops()
  const last = stops.at(-1)
  if (last == null) return null
  if (dir > 0) return y >= last - EDGE ? null : (stops.find((p) => p > y + EDGE) ?? null)
  return y > last + EDGE ? null : (stops.findLast((p) => p < y - EDGE) ?? null)
}

const ease = (k) => (k < 0.5 ? 4 * k * k * k : 1 - (-2 * k + 2) ** 3 / 2)

const isEditable = (el) => el instanceof Element && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName) || Boolean(el.closest('[role="listbox"],[role="dialog"]')))

export function useCheckpointScroll() {
  const reduceMotion = useReducedMotion()

  useEffect(() => {
    if (reduceMotion) return undefined
    const root = document.documentElement

    // Phones and tablets: CSS snapping only, and only within the reel
    if (window.matchMedia('(pointer: coarse)').matches) {
      let jumpUntil = 0 // an in-page link is scrolling the page: no snapping meanwhile
      const sync = () => {
        const last = reelStops().at(-1)
        const inReel = last != null && window.scrollY <= last + EDGE
        if (!inReel) jumpUntil = 0 // the link's scroll has left the reel
        root.classList.toggle('home-snap', inReel && performance.now() > jumpUntil)
      }
      // Links to a spot on this page (e.g. the reel's "Start Building" →
      // #students) would otherwise be snapped straight back to the reel
      const onClick = (e) => {
        if (!(e.target instanceof Element) || !e.target.closest('a[href^="#"]:not([href="#"])')) return
        jumpUntil = performance.now() + 4000 // until it leaves the reel; this is a fallback
        root.classList.remove('home-snap')
      }
      sync()
      window.addEventListener('scroll', sync, { passive: true })
      window.addEventListener('scrollend', sync)
      window.addEventListener('resize', sync)
      document.addEventListener('click', onClick, true)
      return () => {
        window.removeEventListener('scroll', sync)
        window.removeEventListener('scrollend', sync)
        window.removeEventListener('resize', sync)
        document.removeEventListener('click', onClick, true)
        root.classList.remove('home-snap')
      }
    }

    let animating = false
    let raf = 0
    let lastWheel = 0 // time of the previous wheel event
    let swallowUntil = 0 // ignore the rest of a gesture that already stepped
    let cooldownUntil = 0 // briefly after a glide lands…
    let glideDir = 0 // …ignore wheel events in the direction it went
    let acc = 0

    const glide = (to) => {
      const from = window.scrollY
      const dist = to - from
      if (Math.abs(dist) < 2) return
      glideDir = Math.sign(dist)
      // Unhurried: ~0.9 s for a screen-length step, up to 1.4 s for longer ones
      const duration = Math.min(1400, Math.max(850, 650 + (Math.abs(dist) / window.innerHeight) * 300))
      const t0 = performance.now()
      animating = true
      const frame = (t) => {
        const k = Math.min(1, (t - t0) / duration)
        window.scrollTo({ top: from + dist * ease(k), behavior: 'instant' })
        if (k < 1) raf = requestAnimationFrame(frame)
        else {
          animating = false
          cooldownUntil = performance.now() + COOLDOWN_MS
        }
      }
      raf = requestAnimationFrame(frame)
    }

    const onWheel = (e) => {
      if (e.ctrlKey || e.defaultPrevented) return // pinch-zoom, or handled inside (e.g. a map)
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return // sideways scrolling
      const now = performance.now()
      const newGesture = now - lastWheel > MOMENTUM_GAP_MS
      lastWheel = now

      // During a glide, and for the momentum tail of the gesture that
      // started it, keep the page still
      const sameWay = Math.sign(e.deltaY) === glideDir
      if (animating || (sameWay && now < cooldownUntil) || (!newGesture && now < swallowUntil)) {
        e.preventDefault()
        swallowUntil = now + MOMENTUM_GAP_MS
        return
      }
      if (newGesture) acc = 0

      const delta = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaMode === 2 ? e.deltaY * window.innerHeight : e.deltaY
      const dir = Math.sign(delta)
      if (!dir) return
      const target = stepTarget(dir)
      if (target == null) {
        acc = 0
        return // native scrolling (tall section / ends)
      }
      e.preventDefault()
      acc = Math.sign(acc) === dir ? acc + delta : delta
      if (Math.abs(acc) < THRESHOLD) return
      acc = 0
      swallowUntil = now + MOMENTUM_GAP_MS
      glide(target)
    }

    const onKey = (e) => {
      if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || isEditable(e.target)) return
      const t = e.target instanceof Element ? e.target : null
      let dir = 0
      if (e.key === 'ArrowDown' || e.key === 'PageDown') dir = 1
      else if (e.key === 'ArrowUp' || e.key === 'PageUp') dir = -1
      else if (e.key === ' ' && !t?.closest('button, a, summary, [role="button"]')) dir = e.shiftKey ? -1 : 1
      if (!dir) return
      if (animating) {
        e.preventDefault()
        return
      }
      const target = stepTarget(dir)
      if (target == null) return
      e.preventDefault()
      glide(target)
    }

    window.addEventListener('wheel', onWheel, { passive: false })
    window.addEventListener('keydown', onKey)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('wheel', onWheel)
      window.removeEventListener('keydown', onKey)
    }
  }, [reduceMotion])
}

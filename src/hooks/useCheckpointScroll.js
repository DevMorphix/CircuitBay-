import { useEffect } from 'react'
import { useReducedMotion } from './useReducedMotion.js'

// Home page "checkpoint" scrolling: a small scroll moves to the next
// checkpoint (each story-reel chapter, each section, the footer) instead of
// scrolling freely. Checkpoints are elements marked `data-checkpoint`; their
// scroll-margin-top (the fixed header) is respected.
//
//  - Mouse wheel / trackpad / keyboard: a smooth glide to the next or
//    previous checkpoint. Trackpad momentum after a glide is swallowed so
//    one flick moves one step.
//  - Sections taller than the screen scroll normally inside; the glide
//    takes over again once their end is in view (nothing is ever skipped).
//  - Touch screens: native CSS snapping (`html.home-snap`, mandatory) on the
//    same checkpoints — hijacking touch scrolling feels wrong on phones.
//  - Off entirely with prefers-reduced-motion.

const TALL = 1.05 // sections taller than this many screens are read with normal scrolling
const THRESHOLD = 12 // px of wheel movement before a step starts
const MOMENTUM_GAP_MS = 220 // wheel events closer than this are one gesture
const COOLDOWN_MS = 350 // after a glide, stragglers from the same flick (same direction) are ignored
const EDGE = 4 // px tolerance

// Checkpoints (scroll positions), plus the tall sections' scroll ranges.
// `data-checkpoint="step"` marks story-reel stops: the gaps between them
// are scrubbing distance, always glided, never read.
function layout() {
  const vh = window.innerHeight
  const max = document.documentElement.scrollHeight - vh
  const clamp = (y) => Math.max(0, Math.min(Math.round(y), max))
  const stops = [max] // the very bottom (footer)
  const tall = []
  for (const el of document.querySelectorAll('[data-checkpoint]')) {
    const rect = el.getBoundingClientRect()
    const margin = parseFloat(getComputedStyle(el).scrollMarginTop) || 0
    const top = clamp(rect.top + window.scrollY - margin)
    stops.push(top)
    if (el.dataset.checkpoint !== 'step' && rect.height + margin > vh * TALL) {
      // Scroll range where part of the section is still below the screen;
      // its end is also a stop (arriving from below shows the section's end)
      const end = clamp(top + rect.height + margin - vh)
      tall.push({ top, end })
      stops.push(end)
    }
  }
  return { stops: [...new Set(stops)].sort((a, b) => a - b), tall }
}

// Where one step in `dir` (1 = down, -1 = up) should go, or null to let the
// browser scroll natively (reading inside a tall section, or at either end).
function stepTarget(dir) {
  const y = window.scrollY
  const { stops, tall } = layout()
  if (dir > 0) {
    if (tall.some((r) => y >= r.top - EDGE && y < r.end - EDGE)) return null
    return stops.find((p) => p > y + EDGE) ?? null
  }
  if (tall.some((r) => y > r.top + EDGE && y <= r.end + EDGE)) return null
  return stops.findLast((p) => p < y - EDGE) ?? null
}

const ease = (k) => (k < 0.5 ? 4 * k * k * k : 1 - (-2 * k + 2) ** 3 / 2)

const isEditable = (el) => el instanceof Element && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName) || Boolean(el.closest('[role="listbox"],[role="dialog"]')))

export function useCheckpointScroll() {
  const reduceMotion = useReducedMotion()

  useEffect(() => {
    if (reduceMotion) return undefined
    const root = document.documentElement

    // Phones and tablets: CSS snapping only
    if (window.matchMedia('(pointer: coarse)').matches) {
      root.classList.add('home-snap')
      return () => root.classList.remove('home-snap')
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

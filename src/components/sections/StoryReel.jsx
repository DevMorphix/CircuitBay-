import { memo, useEffect, useRef, useState } from 'react'
import { motion, useScroll, useMotionValueEvent, useTransform } from 'framer-motion'
import { story } from '../../content/siteContent.js'
import { Button } from '../ui/Button.jsx'
import { useFramePreloader } from '../../hooks/useFramePreloader.js'
import { useReducedMotion } from '../../hooks/useReducedMotion.js'

const { chapters, frameCount, framePath } = story

const ACTIVE_EPSILON = 0.002

// Static per-chapter geometry, precomputed once — `chapters` never changes
// at runtime, so there's no reason to recompute spans/buffers on every tick.
const chapterMeta = chapters.map((chapter) => {
  const [start, end] = chapter.progress
  const span = end - start
  return { start, end, mountBuffer: Math.max(span * 0.4, 0.05) }
})

function computeChapterFlags(p) {
  let active = 0
  let mounted = 0
  for (let i = 0; i < chapterMeta.length; i++) {
    const { start, end, mountBuffer } = chapterMeta[i]
    if (p >= start - ACTIVE_EPSILON && p <= end + ACTIVE_EPSILON) active |= 1 << i
    if (p >= start - mountBuffer && p <= end + mountBuffer) mounted |= 1 << i
  }
  return { active, mounted }
}

// A single shared subscription for all 5 chapters' active/mounted state,
// instead of each ChapterCopy/ChapterScrim subscribing independently. Ten
// independent subscriptions each firing `setState` unconditionally on every
// scroll tick (whether or not their derived boolean actually changed) was
// the main source of scroll jank — this bails out before touching React
// state at all unless the combined flags actually changed.
function useChapterFlags(scrollYProgress) {
  const [flags, setFlags] = useState(() => computeChapterFlags(scrollYProgress.get()))
  const lastKeyRef = useRef(flags.active * 64 + flags.mounted)

  useMotionValueEvent(scrollYProgress, 'change', (p) => {
    const next = computeChapterFlags(p)
    const key = next.active * 64 + next.mounted
    if (key === lastKeyRef.current) return
    lastKeyRef.current = key
    setFlags(next)
  })

  return flags
}

// Draws whichever frame the current scroll progress maps to, cover-fit,
// onto a canvas pinned behind the chapter copy. Kept as its own component
// so the imperative rAF-driven draw loop never touches React state.
function FrameCanvas({ scrollYProgress, imagesRef }) {
  const canvasRef = useRef(null)
  const sizeRef = useRef({ w: 0, h: 0, dpr: 1 })
  const lastDrawnIndex = useRef(-1)

  const draw = (index) => {
    const canvas = canvasRef.current
    const images = imagesRef.current
    if (!canvas || !images) return

    // Hold on the closest frame that's actually decoded yet — the reel
    // still needs to render something before the fetch queue catches up.
    let img = images[index]
    if (!img) {
      for (let d = 1; d < frameCount && !img; d++) {
        img = images[Math.max(0, index - d)] || images[Math.min(frameCount - 1, index + d)]
      }
    }
    if (!img) return

    const { w, h, dpr } = sizeRef.current
    if (!w || !h) return
    const ctx = canvas.getContext('2d')

    const scale = Math.max(w / img.naturalWidth, h / img.naturalHeight)
    const dw = img.naturalWidth * scale
    const dh = img.naturalHeight * scale
    const dx = (w - dw) / 2
    const dy = (h - dh) / 2

    ctx.clearRect(0, 0, w, h)
    ctx.drawImage(img, dx * dpr, dy * dpr, dw * dpr, dh * dpr)
  }

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return undefined

    const resize = () => {
      const rect = canvas.getBoundingClientRect()
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = rect.width * dpr
      canvas.height = rect.height * dpr
      sizeRef.current = { w: rect.width, h: rect.height, dpr }
      draw(lastDrawnIndex.current < 0 ? 0 : lastDrawnIndex.current)
    }

    resize()
    window.addEventListener('resize', resize)
    return () => window.removeEventListener('resize', resize)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useMotionValueEvent(scrollYProgress, 'change', (progress) => {
    const index = Math.min(
      frameCount - 1,
      Math.max(0, Math.round(progress * (frameCount - 1))),
    )
    if (index === lastDrawnIndex.current) return
    lastDrawnIndex.current = index
    draw(index)
  })

  // First paint, before any scroll event has fired.
  useEffect(() => {
    draw(0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imagesRef.current[0]])

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 h-full w-full"
      aria-hidden="true"
    />
  )
}

const ChapterCopy = memo(function ChapterCopy({ chapter, scrollYProgress, mounted, active }) {
  const [start, end] = chapter.progress
  const span = end - start
  const fadeIn = start + span * 0.18
  const fadeOutStart = end - span * 0.22
  // The very first chapter is what's on screen at page load (progress 0) —
  // it must render fully visible immediately, not fade in from nothing
  // over the first few percent of scroll.
  const isFirst = start === 0

  const opacity = useTransform(
    scrollYProgress,
    [start, fadeIn, fadeOutStart, end],
    [isFirst ? 1 : 0, 1, 1, chapter.kind === 'closer' ? 1 : 0],
  )
  const y = useTransform(scrollYProgress, [start, fadeIn], [isFirst ? 0 : 24, 0])

  if (!mounted) return null

  const alignClass =
    chapter.align === 'left'
      ? 'items-start text-left mr-auto'
      : chapter.align === 'right'
        ? 'items-end text-right ml-auto'
        : 'items-center text-center mx-auto'

  const c = chapter.content

  return (
    <motion.div
      style={{ opacity, y }}
      inert={!active}
      aria-hidden={!active}
      className={`pointer-events-none absolute inset-x-0 top-0 flex h-full w-full flex-col justify-center px-6`}
    >
      <div className={`${active ? 'pointer-events-auto' : ''} flex w-full max-w-xl flex-col ${alignClass}`}>
        {chapter.kind === 'hero' ? (
          <>
            <h1 className="font-heading text-4xl font-semibold leading-[1.05] tracking-tight text-ink-900 sm:text-5xl lg:text-[3.5rem]">
              <span className="mb-4 block font-body text-xs font-semibold uppercase leading-normal tracking-[0.2em] text-brand-600">
                CircuitBay · {c.eyebrow}
              </span>
              {c.headline}
            </h1>
            <p className="mt-6 max-w-md text-base leading-relaxed text-ink-600 sm:text-lg">
              {c.subcopy}
            </p>
            <div className="mt-10 flex flex-wrap gap-4">
              <Button
                href="#students"
                variant="primary"
                event={{ name: 'cta_click', params: { cta: 'hero_start_building' } }}
              >
                {c.ctaPrimary}
              </Button>
              <Button
                href="#who-we-are"
                variant="secondary"
                event={{ name: 'cta_click', params: { cta: 'hero_explore_bay' } }}
              >
                {c.ctaSecondary}
              </Button>
            </div>
          </>
        ) : (
          <>
            <p className="mb-4 text-xs font-semibold tracking-[0.2em] text-ink-400">
              {c.kicker}
            </p>
            <h2 className="font-heading text-3xl font-semibold text-ink-900 sm:text-4xl">
              {c.headline}
            </h2>
            <p className="mt-5 max-w-md text-base leading-relaxed text-ink-600">{c.body}</p>
            {chapter.kind === 'closer' && (
              <div className="mt-9 flex flex-wrap justify-center gap-4">
                <Button
                  href="#students"
                  variant="primary"
                  event={{ name: 'cta_click', params: { cta: 'delivered_start_building' } }}
                >
                  {c.ctaPrimary}
                </Button>
                <Button
                  href="#who-we-are"
                  variant="secondary"
                  event={{ name: 'cta_click', params: { cta: 'delivered_see_shipped' } }}
                >
                  {c.ctaSecondary}
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </motion.div>
  )
})

// A scrim per-chapter, not a single global one — the hero needs contrast on
// its left third, the centered "beat" chapters need it edge-to-edge but
// lighter, and the closer needs it strongest at the bottom where its card
// sits. Cross-fades with the same progress window as the copy it backs.
const ChapterScrim = memo(function ChapterScrim({ chapter, scrollYProgress, mounted }) {
  const [start, end] = chapter.progress
  const span = end - start
  const isFirst = start === 0
  const opacity = useTransform(
    scrollYProgress,
    [start, start + span * 0.18, end - span * 0.22, end],
    [isFirst ? 1 : 0, 1, 1, chapter.kind === 'closer' ? 1 : 0],
  )

  if (!mounted) return null

  const gradient =
    chapter.align === 'left'
      ? 'bg-gradient-to-r from-white via-white/75 to-transparent'
      : chapter.align === 'right'
        ? 'bg-gradient-to-l from-white via-white/75 to-transparent'
        : 'bg-gradient-to-t from-white/90 via-white/40 to-transparent'

  return (
    <motion.div
      style={{ opacity }}
      className={`pointer-events-none absolute inset-0 ${gradient}`}
    />
  )
})

function ProgressRail({ scrollYProgress }) {
  const scaleY = useTransform(scrollYProgress, [0, 1], [0, 1])
  return (
    <div className="pointer-events-none absolute right-5 top-1/2 hidden h-40 w-px -translate-y-1/2 bg-ink-900/10 sm:block">
      <motion.div
        style={{ scaleY, transformOrigin: 'top' }}
        className="h-full w-full bg-brand-500"
      />
      <div className="absolute inset-0">
        {chapters.map((chapter) => (
          <span
            key={chapter.id}
            style={{ top: `${chapter.progress[0] * 100}%` }}
            className="absolute left-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-ink-900/20"
          />
        ))}
      </div>
    </div>
  )
}

function ReducedMotionStory() {
  return (
    <div className="bg-white">
      {chapters.map((chapter) => {
        const c = chapter.content
        const frameIndex = Math.round(chapter.progress[0] * (frameCount - 1)) + 1
        return (
          <section
            key={chapter.id}
            id={chapter.id === 'spark' ? 'top' : undefined}
            className="mx-auto flex max-w-5xl flex-col items-center gap-8 px-6 py-20 text-center md:flex-row md:text-left"
          >
            <img
              src={framePath(frameIndex)}
              alt=""
              aria-hidden="true"
              className="w-full max-w-sm rounded-2xl border border-black/5 shadow-sm md:w-1/2"
              loading="lazy"
            />
            <div className="md:w-1/2">
              {chapter.kind === 'hero' ? (
                // Same keyword-bearing H1 as the animated reel
                <h1 className="font-heading text-3xl font-semibold text-ink-900 sm:text-4xl">
                  <span className="mb-4 block font-body text-xs font-semibold uppercase leading-normal tracking-[0.2em] text-brand-600">
                    CircuitBay · {c.eyebrow}
                  </span>
                  {c.headline}
                </h1>
              ) : (
                <>
                  <p className="mb-4 text-xs font-semibold tracking-[0.2em] text-brand-600">{c.kicker}</p>
                  <h2 className="font-heading text-3xl font-semibold text-ink-900 sm:text-4xl">{c.headline}</h2>
                </>
              )}
              <p className="mt-5 text-base leading-relaxed text-ink-600">
                {chapter.kind === 'hero' ? c.subcopy : c.body}
              </p>
              {(chapter.kind === 'hero' || chapter.kind === 'closer') && (
                <div className="mt-8 flex flex-wrap justify-center gap-4 md:justify-start">
                  <Button href="#students" variant="primary">
                    {c.ctaPrimary}
                  </Button>
                  <Button href="#who-we-are" variant="secondary">
                    {c.ctaSecondary}
                  </Button>
                </div>
              )}
            </div>
          </section>
        )
      })}
    </div>
  )
}

// The reel: one 500vh scroll track pinned to a single sticky viewport. Scroll
// position through that track drives two things at once from the same
// motion value — which of the 40 delivery-story frames paints on the canvas,
// and which chapter's copy is faded in over it — so the copy is never just
// "near" the right shot, it's mathematically the same progress number.
export function StoryReel() {
  const reduceMotion = useReducedMotion()
  const trackRef = useRef(null)
  const { imagesRef, firstReady } = useFramePreloader(frameCount, framePath)

  const { scrollYProgress } = useScroll({
    target: trackRef,
    offset: ['start start', 'end end'],
  })
  const { active: activeMask, mounted: mountedMask } = useChapterFlags(scrollYProgress)

  if (reduceMotion) return <ReducedMotionStory />

  return (
    <section
      id="top"
      ref={trackRef}
      className="relative snap-start bg-white"
      style={{ height: '520vh' }}
    >
      <div className="sticky top-0 h-[100svh] overflow-hidden bg-surface-soft">
        {!firstReady && (
          <div className="absolute inset-0 animate-pulse-soft bg-brand-50" />
        )}
        <FrameCanvas scrollYProgress={scrollYProgress} imagesRef={imagesRef} />
        {chapters.map((chapter, i) => (
          <ChapterScrim
            key={`scrim-${chapter.id}`}
            chapter={chapter}
            scrollYProgress={scrollYProgress}
            mounted={Boolean(mountedMask & (1 << i))}
          />
        ))}
        <div className="relative mx-auto h-full w-full max-w-6xl pt-24">
          {chapters.map((chapter, i) => (
            <ChapterCopy
              key={chapter.id}
              chapter={chapter}
              scrollYProgress={scrollYProgress}
              mounted={Boolean(mountedMask & (1 << i))}
              active={Boolean(activeMask & (1 << i))}
            />
          ))}
        </div>
        <ProgressRail scrollYProgress={scrollYProgress} />
      </div>
    </section>
  )
}

import { useContext, useRef, useState } from 'react'
import { motion, useScroll } from 'framer-motion'
import { useInView } from '../../hooks/useInView.js'
import { useReducedMotion } from '../../hooks/useReducedMotion.js'
import { useProgressMap } from '../../hooks/useProgressMap.js'
import { isInitialPage, useHydrated } from '../../lib/hydration.js'
import { ScrollRevealContext } from '../../lib/scrollReveal.js'

// Starting pose for each entrance style (the end pose is always "in place")
const FROM = {
  up: { y: 48 },
  left: { x: -56 },
  right: { x: 56 },
  scale: { scale: 0.92, y: 24 },
}

// Fade + move wrapper for section content.
//
// On the home page (inside <ScrollRevealScope>) it is scroll-linked: the
// element eases in as it scrolls up into view — fully in place by the time
// it reaches the upper third of the screen — and rewinds when scrolled back.
// `delay` staggers siblings (a later start on the same scroll distance).
//
// Elsewhere it plays once as it comes into view; content on the first
// (prerendered) page is shown immediately. Motion-free with reduced motion.
export function Reveal(props) {
  const scrollLinked = useContext(ScrollRevealContext)
  return scrollLinked ? <ScrollReveal {...props} /> : <OnceReveal {...props} />
}

// Turns on scroll-linked reveals for everything inside it
export function ScrollRevealScope({ children }) {
  return <ScrollRevealContext.Provider value={true}>{children}</ScrollRevealContext.Provider>
}

function ScrollReveal({ children, as = 'div', delay = 0, from = 'up', className = '' }) {
  const ref = useRef(null)
  const hydrated = useHydrated()
  const reduceMotion = useReducedMotion()
  // 0 = element's top at the bottom of the screen, 1 = at 70% of its height
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'start 0.7'] })
  const shift = Math.min(delay * 2.2, 0.35)
  const range = [shift, Math.min(1, 0.65 + shift)]
  const pose = FROM[from] ?? FROM.up
  const opacity = useProgressMap(scrollYProgress, range, [0, 1])
  const x = useProgressMap(scrollYProgress, range, [pose.x ?? 0, 0])
  const y = useProgressMap(scrollYProgress, range, [pose.y ?? 0, 0])
  const scale = useProgressMap(scrollYProgress, range, [pose.scale ?? 1, 1])

  // Prerendered HTML (and the first render in the browser) shows everything
  // in place, so there's no invisible content without JavaScript; the
  // scroll-linked style is attached once hydrated
  const Component = motion[as] ?? motion.div
  return (
    <Component ref={ref} className={className} style={hydrated && !reduceMotion ? { opacity, x, y, scale } : undefined}>
      {children}
    </Component>
  )
}

function OnceReveal({ children, as = 'div', delay = 0, className = '' }) {
  const [ref, inView] = useInView({ threshold: 0.2 })
  const reduceMotion = useReducedMotion()
  const [instant] = useState(isInitialPage)
  const Component = motion[as] ?? motion.div

  if (reduceMotion) {
    const Static = as
    return (
      <Static ref={ref} className={className}>
        {children}
      </Static>
    )
  }

  return (
    <Component
      ref={ref}
      className={className}
      initial={instant ? false : { opacity: 0, y: 24 }}
      animate={instant || inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </Component>
  )
}

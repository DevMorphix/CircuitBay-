import { useState } from 'react'
import { motion } from 'framer-motion'
import { useInView } from '../../hooks/useInView.js'
import { useReducedMotion } from '../../hooks/useReducedMotion.js'
import { isInitialPage } from '../../lib/hydration.js'

// Fade + rise wrapper used to bring each section's content in as it scrolls
// into view. Content on the first (prerendered) page is shown immediately —
// no flash, no layout work for crawlers — and pages reached by client-side
// navigation animate in. Motion-free when the visitor prefers reduced motion.
export function Reveal({ children, as = 'div', delay = 0, className = '' }) {
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

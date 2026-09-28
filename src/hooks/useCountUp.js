import { useEffect, useRef, useState } from 'react'

// Animates from 0 to `target` once `start` becomes true. Uses
// requestAnimationFrame rather than setInterval so it stays smooth and cheap.
export function useCountUp(target, { start = false, duration = 1400, reduceMotion = false } = {}) {
  const [value, setValue] = useState(0)
  const started = useRef(false)

  useEffect(() => {
    if (!start || reduceMotion || started.current) return
    started.current = true

    let raf
    const startTime = performance.now()

    const tick = (now) => {
      const progress = Math.min((now - startTime) / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3) // ease-out cubic
      setValue(Math.round(eased * target))
      if (progress < 1) raf = requestAnimationFrame(tick)
    }

    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [start, target, duration, reduceMotion])

  // Reduced motion: show the final number immediately, no animation
  return reduceMotion ? target : value
}

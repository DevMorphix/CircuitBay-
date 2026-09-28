import { useEffect, useRef, useState } from 'react'

// Fires once when the element first crosses the viewport threshold — used to
// trigger scroll-in animations (circuit traces lighting up, stat count-up)
// without re-triggering on every scroll pass.
export function useInView({ threshold = 0.35, rootMargin = '0px' } = {}) {
  const ref = useRef(null)
  const [inView, setInView] = useState(false)

  useEffect(() => {
    const node = ref.current
    if (!node || inView) return undefined

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true)
          observer.disconnect()
        }
      },
      { threshold, rootMargin },
    )

    observer.observe(node)
    return () => observer.disconnect()
  }, [inView, threshold, rootMargin])

  return [ref, inView]
}

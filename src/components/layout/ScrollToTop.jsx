import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { markNavigated } from '../../lib/hydration.js'

// On route change: jump to the #hash target if there is one, otherwise to
// the top of the page. The first run is the initial page load — the
// browser already handles scroll position there.
export function ScrollToTop() {
  const { pathname, hash } = useLocation()
  const first = useRef(true)

  useEffect(() => {
    if (first.current) {
      first.current = false
      if (!hash) return undefined
    } else {
      markNavigated()
    }
    if (hash) {
      // Wait a frame so the new page has rendered its target
      const id = requestAnimationFrame(() => {
        document.getElementById(decodeURIComponent(hash.slice(1)))?.scrollIntoView({ behavior: 'smooth' })
      })
      return () => cancelAnimationFrame(id)
    }
    window.scrollTo(0, 0)
    return undefined
  }, [pathname, hash])

  return null
}

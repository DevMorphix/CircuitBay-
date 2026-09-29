import { Component } from 'react'
import { useLocation } from 'react-router-dom'
import { reportError } from '../../lib/monitoring.js'

// After a new deploy, a visitor with the old page open can fail to load a
// page chunk that no longer exists. Reloading fetches the new version —
// once, so a genuinely broken chunk can't cause a reload loop.
const isStaleChunk = (error) => /dynamically imported module|Importing a module script failed|Loading chunk/i.test(String(error?.message))

function reloadOnce() {
  try {
    if (sessionStorage.getItem('cb_chunk_reload')) return false
    sessionStorage.setItem('cb_chunk_reload', '1')
  } catch {
    return false
  }
  window.location.reload()
  return true
}

class Boundary extends Component {
  state = { error: null }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    if (isStaleChunk(error) && reloadOnce()) return
    reportError(error, { componentStack: info.componentStack })
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <main id="main" className="section-soft flex min-h-screen items-center justify-center px-4">
        <div className="card max-w-md p-8 text-center">
          <p className="eyebrow mb-3">SOMETHING WENT WRONG</p>
          <h1 className="font-heading text-2xl font-semibold text-ink-900">This page hit a snag.</h1>
          <p className="mt-3 text-ink-600">We've been notified. Try again — your cart is safe.</p>
          <div className="mt-6 flex justify-center gap-3">
            <button type="button" onClick={() => window.location.reload()} className="rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700">
              Reload the page
            </button>
            <a href="/" className="rounded-xl border border-black/10 px-5 py-2.5 text-sm font-semibold text-ink-900 hover:border-brand-600">
              Go home
            </a>
          </div>
        </div>
      </main>
    )
  }
}

// Resets when the visitor navigates to another page
export function ErrorBoundary({ children }) {
  const { pathname } = useLocation()
  return <Boundary key={pathname}>{children}</Boundary>
}

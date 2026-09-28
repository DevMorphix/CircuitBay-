import { Link } from 'react-router-dom'
import { brand } from '../../content/siteContent.js'

// TODO_CLIENT: placeholder mark. Swap the inline <svg> for
// <img src="/logo.svg"> once the real logo is supplied, and replace the
// favicon set in /public (favicon.svg, favicon-16/32.png,
// apple-touch-icon.png, icon-192/512.png).
export function Logo({ dark = false, size = 28, suffix }) {
  return (
    <Link to="/" className={`flex items-center gap-2 ${dark ? 'text-white' : 'text-ink-900'}`}>
      <svg width={size} height={size} viewBox="0 0 28 28" aria-hidden="true">
        <rect width="28" height="28" rx="7" fill="#3F7DDE" />
        <path
          d="M8 14h4l2-4 4 8 2-4h4"
          stroke="white"
          strokeWidth="2"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span className="font-heading text-lg font-semibold tracking-tight">{brand.name}</span>
      {suffix && (
        <span className="rounded-md bg-brand-500/10 px-1.5 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wider text-brand-600">
          {suffix}
        </span>
      )}
    </Link>
  )
}

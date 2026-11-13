import { Link } from 'react-router-dom'
import { brand } from '../../content/siteContent.js'

// Brand mark (/logo.png, 128px: sharp up to ~40px on 3x screens) + name.
// The favicon and app icons in /public are made from the same artwork.
export function Logo({ dark = false, size = 28, suffix }) {
  return (
    <Link to="/" className={`flex items-center gap-2 ${dark ? 'text-white' : 'text-ink-900'}`}>
      <img src="/logo.png" width={size} height={size} alt="" aria-hidden="true" className="rounded-full" />
      <span className="font-heading text-lg font-semibold tracking-tight">{brand.name}</span>
      {suffix && (
        <span className="rounded-md bg-brand-500/10 px-1.5 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wider text-brand-600">
          {suffix}
        </span>
      )}
    </Link>
  )
}

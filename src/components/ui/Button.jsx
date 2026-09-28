import { Link } from 'react-router-dom'
import { trackEvent } from '../../lib/analytics.js'

const VARIANTS = {
  primary:
    // brand-600 keeps white text above 4.5:1 contrast (brand-500 is 4.0:1)
    'bg-brand-600 text-white hover:bg-brand-700 shadow-[0_0_0_0_rgba(63,125,222,0)] hover:shadow-[0_0_24px_2px_rgba(63,125,222,0.45)]',
  secondary:
    'bg-white/80 text-brand-700 border border-brand-600/50 hover:border-brand-600 hover:bg-brand-500/5',
  // Outline button for use on navy sections
  'secondary-dark':
    'bg-transparent text-white border border-white/35 hover:border-white hover:bg-white/10',
  dark: 'bg-navy-900 text-white hover:bg-navy-800',
}

// `to` renders a router <Link> (internal pages), `href` a plain <a>
// (in-page anchors / external), otherwise a <button>.
export function Button({
  as = 'button',
  href,
  to,
  variant = 'primary',
  event,
  className = '',
  children,
  ...rest
}) {
  const Component = to ? Link : as === 'a' || href ? 'a' : 'button'
  const base =
    'inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3 font-semibold text-sm tracking-wide transition-all duration-300 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500'

  const handleClick = (e) => {
    if (event) trackEvent(event.name, event.params)
    rest.onClick?.(e)
  }

  return (
    <Component
      href={href}
      to={to}
      className={`${base} ${VARIANTS[variant]} ${className}`}
      {...rest}
      onClick={handleClick}
    >
      {children}
    </Component>
  )
}

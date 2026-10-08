import { Link } from 'react-router-dom'

// Standard card: white, soft shadow, 12px radius, hover lift + blue
// circuit-trace glow. `dark` switches to the translucent navy variant.
// `to` → router Link, `href` → <a>, otherwise a plain <div>.
export function Card({ to, href, dark = false, hover = true, className = '', children, ...rest }) {
  const classes = `card ${dark ? 'card-dark' : ''} ${hover ? 'card-hover' : ''} group block ${className}`
  if (to) {
    return (
      <Link to={to} className={classes} {...rest}>
        {children}
      </Link>
    )
  }
  if (href) {
    return (
      <a href={href} className={classes} {...rest}>
        {children}
      </a>
    )
  }
  return (
    <div className={classes} {...rest}>
      {children}
    </div>
  )
}

export function ArrowLink({ to, href, children, dark = false, className = '' }) {
  const classes = `inline-flex items-center gap-1.5 text-sm font-semibold transition-colors ${
    dark ? 'text-brand-300 hover:text-white' : 'text-brand-600 hover:text-brand-700'
  } ${className}`
  const body = (
    <>
      {children}
      <span aria-hidden="true" className="transition-transform group-hover:translate-x-0.5">→</span>
    </>
  )
  return to ? (
    <Link to={to} className={classes}>
      {body}
    </Link>
  ) : (
    <a href={href} className={classes}>
      {body}
    </a>
  )
}

// Arrow label for use *inside* a linked card (avoids nesting <a> in <a>).
export function ArrowText({ children, dark = false, className = '' }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-sm font-semibold ${dark ? 'text-brand-300' : 'text-brand-600'} ${className}`}
    >
      {children}
      <span aria-hidden="true" className="transition-transform duration-300 group-hover:translate-x-1">→</span>
    </span>
  )
}

// Real image when `src` is set (uploaded in /admin), otherwise the
// blueprint placeholder. `label` is the alt text either way.
export function Photo({ src, label = 'Photo', className = '', eager = false }) {
  if (src) {
    return <img src={src} alt={label} loading={eager ? 'eager' : 'lazy'} decoding="async" className={`bg-surface-soft object-cover ${className}`} />
  }
  // TODO_CLIENT: real workshop / student photography, not stock.
  return (
    <div role="img" aria-label={label} className={`photo-placeholder ${className}`}>
      <span className="px-4">{label}</span>
    </div>
  )
}

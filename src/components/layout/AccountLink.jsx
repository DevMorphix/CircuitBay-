import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext.jsx'
import { Icon } from '../ui/Icon.jsx'

// Header account button. Signed in: a filled circle with the person's
// initial, so it's clear at a glance; signed out (or still checking): the
// outline person icon, which leads to sign-in.
export function AccountLink({ className = '' }) {
  const { user, status } = useAuth()
  const base = `flex h-10 w-10 items-center justify-center rounded-xl transition-colors ${className}`

  if (status === 'signed-in' && user) {
    const who = user.name || user.email || user.phone || 'your account'
    const initial = (user.name || user.email || '').trim().charAt(0).toUpperCase()
    return (
      <Link to="/account" aria-label={`My account, signed in as ${who}`} title={`Signed in as ${who}`} className={`${base} hover:bg-brand-500/10`}>
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-600 font-heading text-sm font-bold text-white ring-2 ring-brand-500/25">
          {initial || <Icon name="user" size={18} />}
        </span>
      </Link>
    )
  }

  return (
    <Link to={status === 'signed-out' ? '/login' : '/account'} aria-label="Sign in" title="Sign in" className={`${base} text-ink-600 hover:bg-brand-500/10 hover:text-brand-700`}>
      <Icon name="user" size={22} />
    </Link>
  )
}

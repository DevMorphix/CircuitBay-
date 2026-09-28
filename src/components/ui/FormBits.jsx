import { Icon } from './Icon.jsx'

// Hidden spam trap: real people never fill it in (the API rejects it if set)
export function Honeypot() {
  return (
    <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
      <label>
        Leave this empty
        <input type="text" name="website" tabIndex={-1} autoComplete="off" />
      </label>
    </div>
  )
}

// Error banner for a failed form submission
export function FormError({ message, dark = false }) {
  if (!message) return null
  return (
    <p role="alert" className={`rounded-xl p-3 text-sm font-medium ${dark ? 'bg-white/10 text-white' : 'bg-surface-soft text-ink-900'}`}>
      {message}
    </p>
  )
}

// Success message shown in place of a sent form
export function FormSent({ children, dark = false }) {
  return (
    <p role="status" className={`flex items-start gap-3 ${dark ? 'text-white' : 'text-ink-900'}`}>
      <Icon name="check" className={`shrink-0 ${dark ? 'text-brand-300' : 'text-brand-500'}`} /> {children}
    </p>
  )
}

// Inline message under a field, from the API's 400 details
export function FieldError({ id, message, dark = false }) {
  if (!message) return null
  return (
    <p id={id} className={`mt-1 text-xs font-medium ${dark ? 'text-brand-100' : 'text-navy-800'}`}>
      {message}
    </p>
  )
}

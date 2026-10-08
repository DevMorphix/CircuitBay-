import { useState } from 'react'
import { Icon } from '../../components/ui/Icon.jsx'
import { api } from '../../lib/api.js'
import { btn, ORDER_STATUS } from './format.js'

// Shared building blocks for the admin screens (same theme as the site).

const TONES = {
  new: 'bg-brand-600 text-white',
  active: 'bg-brand-500/10 text-brand-700',
  done: 'bg-navy-900 text-white',
  muted: 'bg-black/5 text-ink-600',
}

export function Pill({ tone = 'active', children }) {
  return <span className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ${TONES[tone]}`}>{children}</span>
}

export const StatusPill = ({ status }) => {
  const s = ORDER_STATUS[status] ?? { label: status, tone: 'muted' }
  return <Pill tone={s.tone}>{s.label}</Pill>
}

export function PageTitle({ title, subtitle, action }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="font-heading text-2xl font-semibold text-ink-900">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-ink-600">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}

export function Panel({ title, children, className = '', action }) {
  return (
    <section className={`card p-5 ${className}`}>
      {(title || action) && (
        <div className="mb-4 flex items-center justify-between gap-3">
          {title && <h2 className="font-heading text-base font-semibold text-ink-900">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  )
}

export function Empty({ children }) {
  return <p className="py-10 text-center text-sm text-ink-600">{children}</p>
}

export function LoadState({ loading, error, children }) {
  if (error) return <p role="alert" className="rounded-xl bg-surface-soft p-4 text-sm text-ink-900">{error.message}</p>
  if (loading) return <p className="py-10 text-center text-sm text-ink-600" aria-busy="true">Loading…</p>
  return children
}

export function Field({ label, id, hint, error, className = '', as = 'input', children, ...rest }) {
  const Tag = as
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-ink-900">
        {label}
      </label>
      {children ?? <Tag id={id} className="field" aria-invalid={Boolean(error)} {...rest} />}
      {hint && !error && <p className="mt-1 text-xs text-ink-400">{hint}</p>}
      {error && <p className="mt-1 text-xs font-medium text-navy-800">{error}</p>}
    </div>
  )
}

// Uploads files to R2 via the API and reports the stored keys
export function Uploader({ folder, accept = 'image/*', multiple = false, onUploaded, label = 'Upload' }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const onChange = async (e) => {
    const files = [...e.target.files]
    e.target.value = ''
    if (!files.length) return
    setBusy(true)
    setError('')
    try {
      const uploaded = []
      for (const f of files) uploaded.push(await api.upload(f, folder))
      onUploaded(uploaded)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }
  return (
    <div>
      <label className={`${btn.secondary} cursor-pointer`}>
        <Icon name="plus" size={16} /> {busy ? 'Uploading…' : label}
        <input type="file" accept={accept} multiple={multiple} className="sr-only" onChange={onChange} disabled={busy} />
      </label>
      {error && <p className="mt-1 text-xs font-medium text-navy-800">{error}</p>}
    </div>
  )
}


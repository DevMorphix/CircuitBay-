import { useState } from 'react'
import { openInvoice } from '../../lib/api.js'
import { Icon } from '../ui/Icon.jsx'

// Opens the GST tax invoice in a new tab. `body` → guest lookup (POST with
// the order id + email/phone); otherwise a GET for signed-in owners/admins.
export function InvoiceButton({ path, body, label = 'Invoice', className = '' }) {
  const [error, setError] = useState('')
  const open = async () => {
    setError('')
    try {
      await openInvoice(body ? 'POST' : 'GET', path, body)
    } catch (err) {
      setError(err.message)
    }
  }
  return (
    <span className="inline-flex flex-col">
      <button
        type="button"
        onClick={open}
        className={`inline-flex items-center justify-center gap-2 rounded-xl border border-brand-600/50 bg-white px-4 py-2 text-sm font-semibold text-brand-700 transition-colors hover:border-brand-600 hover:bg-brand-500/5 ${className}`}
      >
        <Icon name="book" size={16} /> {label}
      </button>
      {error && (
        <span role="alert" className="mt-1 text-xs font-medium text-navy-800">
          {error}
        </span>
      )}
    </span>
  )
}

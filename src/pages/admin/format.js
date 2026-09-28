// Formatting helpers for the admin screens

export const rupees = (n) => `₹${Number(n).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`

export const dateTime = (ms) => new Date(ms).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' })

// Public URL for a storage key (same rule as the API's mediaUrl)
export const mediaUrl = (key) => (key ? (/^https?:\/\//.test(key) ? key : `${import.meta.env.VITE_API_URL ?? ''}/media/${key}`) : null)

// Newline-separated textarea ⇄ array
export const linesToList = (s) => s.split('\n').map((l) => l.trim()).filter(Boolean)

export const ORDER_STATUS = {
  pending_payment: { label: 'Awaiting payment', tone: 'muted' },
  payment_failed: { label: 'Payment failed', tone: 'muted' },
  placed: { label: 'Placed', tone: 'new' },
  confirmed: { label: 'Confirmed', tone: 'active' },
  packed: { label: 'Packed', tone: 'active' },
  shipped: { label: 'Shipped', tone: 'active' },
  out_for_delivery: { label: 'Out for delivery', tone: 'active' },
  delivered: { label: 'Delivered', tone: 'done' },
  cancelled: { label: 'Cancelled', tone: 'muted' },
}

// Button class names shared across admin screens
export const btn = {
  primary: 'inline-flex items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50',
  secondary: 'inline-flex items-center justify-center gap-2 rounded-xl border border-black/10 bg-white px-4 py-2 text-sm font-semibold text-ink-900 hover:border-brand-600 hover:text-brand-700 disabled:opacity-50',
  danger: 'inline-flex items-center justify-center gap-2 rounded-xl border border-navy-800/30 bg-white px-4 py-2 text-sm font-semibold text-navy-800 hover:bg-navy-900 hover:text-white disabled:opacity-50',
  link: 'text-sm font-semibold text-brand-700 hover:text-brand-600',
}

export const slugify = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 80)

// Editor state keeps list/table blocks as plain text for easy typing
export const toEditable = (b) =>
  b.type === 'list' ? { type: 'list', text: b.items.join('\n') } : b.type === 'table' ? { type: 'table', text: [b.head, ...b.rows].map((r) => r.join(' | ')).join('\n') } : { ...b }
export const fromEditable = (b) => {
  if (b.type === 'list') return { type: 'list', items: linesToList(b.text) }
  if (b.type === 'table') {
    const [head, ...rows] = linesToList(b.text).map((l) => l.split('|').map((c) => c.trim()))
    return { type: 'table', head: head ?? [], rows }
  }
  if (b.type === 'h2') return { type: 'h2', id: slugify(b.text), text: b.text }
  return { type: b.type, text: b.text }
}


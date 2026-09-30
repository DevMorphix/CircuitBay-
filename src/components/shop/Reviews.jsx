import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Icon } from '../ui/Icon.jsx'
import { useAuth } from '../../context/AuthContext.jsx'
import { api } from '../../lib/api.js'
import { useApi } from '../../lib/useApi.js'

// Read-only stars, e.g. 4 of 5 filled
export function Stars({ value, size = 16, className = '' }) {
  return (
    <span className={`inline-flex ${className}`} role="img" aria-label={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Icon key={n} name="star" size={size} className={n <= Math.round(value) ? 'fill-brand-500 text-brand-500' : 'text-ink-400/40'} />
      ))}
    </span>
  )
}

// Star picker for the review form (radio group, keyboard-friendly)
export function StarInput({ value, onChange, id = 'rating' }) {
  const labels = ['Poor', 'Fair', 'Good', 'Very good', 'Excellent']
  return (
    <fieldset>
      <legend className="mb-1.5 text-sm font-medium text-ink-900">Your rating</legend>
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <label key={n} className="cursor-pointer" title={labels[n - 1]}>
            <input type="radio" name={id} value={n} checked={value === n} onChange={() => onChange(n)} className="peer sr-only" />
            <span className="block rounded peer-focus-visible:outline-2 peer-focus-visible:outline-brand-600">
              <Icon name="star" size={28} className={n <= value ? 'fill-brand-500 text-brand-500' : 'text-ink-400/50 hover:text-brand-500'} />
            </span>
            <span className="sr-only">{`${n} star${n > 1 ? 's' : ''} — ${labels[n - 1]}`}</span>
          </label>
        ))}
        {value > 0 && <span className="ml-2 text-sm text-ink-600">{labels[value - 1]}</span>}
      </div>
    </fieldset>
  )
}

const day = (ms) => new Date(ms).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })

// Product page "Reviews" tab: live from the API (approved reviews only)
export function ProductReviews({ productId }) {
  const { user } = useAuth()
  const first = useApi(`/products/${productId}/reviews`)
  const [more, setMore] = useState({ reviews: [], page: 1, hasMore: null, busy: false })

  if (first.error) return <p>Reviews couldn&rsquo;t be loaded right now.</p>
  if (!first.data) return <p aria-busy="true">Loading reviews…</p>

  const { summary } = first.data
  const reviews = [...first.data.reviews, ...more.reviews]
  const hasMore = more.hasMore ?? first.data.hasMore
  const loadMore = async () => {
    setMore((m) => ({ ...m, busy: true }))
    try {
      const r = await api.get(`/products/${productId}/reviews?page=${more.page + 1}`)
      setMore((m) => ({ reviews: [...m.reviews, ...r.reviews], page: r.page, hasMore: r.hasMore, busy: false }))
    } catch {
      setMore((m) => ({ ...m, busy: false }))
    }
  }

  const writeLink = (
    <Link to={user ? '/account?tab=reviews' : `/login?next=${encodeURIComponent('/account?tab=reviews')}`} className="font-semibold text-brand-700">
      Bought this? Write a review →
    </Link>
  )

  if (summary.count === 0) {
    return (
      <div className="space-y-2">
        <p>No reviews yet. Reviews come only from customers whose order has been delivered.</p>
        {writeLink}
      </div>
    )
  }

  return (
    <div className="grid gap-8 md:grid-cols-[220px_1fr]">
      <div>
        <p className="font-heading text-4xl font-semibold text-ink-900">{summary.average.toFixed(1)}</p>
        <Stars value={summary.average} />
        <p className="mt-1 text-sm">
          {summary.count} verified review{summary.count === 1 ? '' : 's'}
        </p>
        <ul className="mt-4 space-y-1.5" aria-label="Rating breakdown">
          {[5, 4, 3, 2, 1].map((s) => {
            const n = summary.distribution[s] ?? 0
            return (
              <li key={s} className="flex items-center gap-2 text-xs">
                <span className="w-3 text-ink-900">{s}</span>
                <Icon name="star" size={12} className="fill-brand-500 text-brand-500" />
                <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-black/5">
                  <span className="block h-full rounded-full bg-brand-500" style={{ width: `${(n / summary.count) * 100}%` }} />
                </span>
                <span className="w-6 text-right">{n}</span>
              </li>
            )
          })}
        </ul>
        <p className="mt-5 text-sm">{writeLink}</p>
      </div>

      <div>
        <ul className="divide-y divide-black/5">
          {reviews.map((r) => (
            <li key={r.id} className="py-5 first:pt-0">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <Stars value={r.rating} size={14} />
                {r.title && <p className="font-semibold text-ink-900">{r.title}</p>}
              </div>
              <p className="mt-1 text-xs text-ink-400">
                {r.author} · <span className="font-semibold text-brand-700">Verified buyer</span> · {day(r.createdAt)}
              </p>
              <p className="mt-2 whitespace-pre-line text-sm leading-relaxed">{r.body}</p>
              {r.reply && (
                <div className="mt-3 rounded-xl bg-surface-soft p-3 text-sm">
                  <p className="text-xs font-semibold text-ink-900">Reply from CircuitBay</p>
                  <p className="mt-1 whitespace-pre-line">{r.reply}</p>
                </div>
              )}
            </li>
          ))}
        </ul>
        {hasMore && (
          <button type="button" onClick={loadMore} disabled={more.busy} className="mt-2 text-sm font-semibold text-brand-700 hover:underline disabled:opacity-60">
            {more.busy ? 'Loading…' : 'Show more reviews'}
          </button>
        )}
      </div>
    </div>
  )
}

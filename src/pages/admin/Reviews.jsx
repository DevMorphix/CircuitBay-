import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { api } from '../../lib/api.js'
import { useApi } from '../../lib/useApi.js'
import { Stars } from '../../components/shop/Reviews.jsx'
import { Empty, LoadState, PageTitle, Panel, Pill } from './ui.jsx'
import { btn, dateTime } from './format.js'

const FILTERS = [
  { id: 'pending', label: 'To approve' },
  { id: 'approved', label: 'Published' },
  { id: 'rejected', label: 'Rejected' },
  { id: '', label: 'All' },
]
const TONE = { pending: 'new', approved: 'active', rejected: 'muted' }

// Reviews from verified buyers. Nothing is public until approved; the
// product's rating is recalculated on every change.
export function Reviews() {
  const [params, setParams] = useSearchParams()
  const status = params.get('status') ?? 'pending'
  const { data, error, loading, reload } = useApi(`/admin/reviews?limit=100${status ? `&status=${status}` : ''}`)

  return (
    <>
      <PageTitle title="Reviews" subtitle="Only customers with a delivered order can review. Approve to publish; ratings update right away on product pages and after “Publish site changes” on product cards." />
      <div className="mb-4 flex flex-wrap gap-2" role="tablist" aria-label="Filter reviews">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            role="tab"
            aria-selected={status === f.id}
            onClick={() => setParams(f.id ? { status: f.id } : { status: '' })}
            className={status === f.id ? btn.primary : btn.secondary}
          >
            {f.label}
          </button>
        ))}
      </div>
      <Panel>
        <LoadState loading={loading} error={error}>
          {data?.reviews.length === 0 ? (
            <Empty>{status === 'pending' ? 'No reviews waiting.' : 'No reviews here.'}</Empty>
          ) : (
            <ul className="divide-y divide-black/5">
              {data?.reviews.map((r) => (
                <ReviewRow key={r.id} review={r} onChanged={reload} />
              ))}
            </ul>
          )}
        </LoadState>
      </Panel>
    </>
  )
}

function ReviewRow({ review: r, onChanged }) {
  const [reply, setReply] = useState(r.reply ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const save = async (patch) => {
    setBusy(true)
    setError('')
    try {
      await api.patch(`/admin/reviews/${r.id}`, patch)
      onChanged()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <li className="grid gap-3 py-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Link to={`/shop/product/${r.productId}`} className="font-semibold text-brand-700 hover:underline">
            {r.productName}
          </Link>
          <Stars value={r.rating} size={14} />
          <Pill tone={TONE[r.status]}>{r.status}</Pill>
        </div>
        <p className="text-xs text-ink-400">
          {r.author} ({r.customerEmail ?? 'deleted account'}) · <Link to={`/admin/orders/${r.orderId}`} className={btn.link}>order {r.orderId}</Link> · {dateTime(r.updatedAt)}
        </p>
      </div>
      {r.title && <p className="font-semibold text-ink-900">{r.title}</p>}
      <p className="whitespace-pre-line text-sm text-ink-600">{r.body}</p>
      <div className="grid gap-2 sm:grid-cols-[1fr_auto] sm:items-start">
        <textarea
          aria-label={`Public reply to ${r.author}`}
          rows={2}
          className="field text-sm"
          placeholder="Public reply (optional) — shown under the review"
          value={reply}
          onChange={(e) => setReply(e.target.value)}
          maxLength={2000}
        />
        <div className="flex flex-wrap gap-2">
          {r.status !== 'approved' && (
            <button type="button" disabled={busy} className={btn.primary} onClick={() => save({ status: 'approved', reply })}>
              Approve
            </button>
          )}
          {r.status !== 'rejected' && (
            <button type="button" disabled={busy} className={btn.danger} onClick={() => save({ status: 'rejected' })}>
              Reject
            </button>
          )}
          {reply !== (r.reply ?? '') && (
            <button type="button" disabled={busy} className={btn.secondary} onClick={() => save({ reply })}>
              Save reply
            </button>
          )}
        </div>
      </div>
      {error && <p role="alert" className="text-sm font-medium text-navy-800">{error}</p>}
    </li>
  )
}

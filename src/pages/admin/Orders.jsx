import { useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { api } from '../../lib/api.js'
import { InvoiceButton } from '../../components/shop/InvoiceButton.jsx'
import { useApi } from '../../lib/useApi.js'
import { dateTime, rupees, btn, ORDER_STATUS } from './format.js'
import { Empty, Field, LoadState, PageTitle, Panel, Pill, StatusPill } from './ui.jsx'

const FLOW = ['placed', 'confirmed', 'packed', 'shipped', 'out_for_delivery', 'delivered']

// ---------------------------------------------------------------- list --
export function Orders() {
  const [params, setParams] = useSearchParams()
  const status = params.get('status') ?? ''
  const q = params.get('q') ?? ''
  const page = Number(params.get('page') ?? 1)
  const qs = new URLSearchParams({ ...(status && { status }), ...(q && { q }), page: String(page), limit: '50' })
  const { data, error, loading } = useApi(`/admin/orders?${qs}`)

  const update = (patch) => {
    const next = new URLSearchParams(params)
    for (const [k, v] of Object.entries(patch)) {
      if (v) next.set(k, v)
      else next.delete(k)
    }
    if (!('page' in patch)) next.delete('page')
    setParams(next, { replace: true })
  }

  return (
    <>
      <PageTitle title="Orders" subtitle="Newest first. Click an order to update its status." />
      <div className="mb-4 flex flex-wrap gap-3">
        <input
          type="search"
          defaultValue={q}
          placeholder="Search order ID, name, email or phone"
          aria-label="Search orders"
          className="field max-w-sm"
          onKeyDown={(e) => e.key === 'Enter' && update({ q: e.currentTarget.value.trim() })}
        />
        <select aria-label="Filter by status" value={status} onChange={(e) => update({ status: e.target.value })} className="field w-auto!">
          <option value="">All statuses</option>
          {Object.entries(ORDER_STATUS).map(([k, v]) => (
            <option key={k} value={k}>
              {v.label}
            </option>
          ))}
        </select>
      </div>

      <Panel>
        <LoadState loading={loading} error={error}>
          {data?.orders.length === 0 ? (
            <Empty>No orders match.</Empty>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="text-xs uppercase tracking-wider text-ink-400">
                  <tr>
                    <th className="py-2 pr-4">Order</th>
                    <th className="py-2 pr-4">Customer</th>
                    <th className="py-2 pr-4">Placed</th>
                    <th className="py-2 pr-4">Total</th>
                    <th className="py-2">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/5">
                  {data?.orders.map((o) => (
                    <tr key={o.id} className="hover:bg-surface-soft">
                      <td className="py-3 pr-4">
                        <Link to={`/admin/orders/${o.id}`} className="font-semibold text-brand-700 hover:underline">
                          #{o.id}
                        </Link>
                      </td>
                      <td className="py-3 pr-4">
                        <p className="text-ink-900">{o.contact.name}</p>
                        <p className="text-xs text-ink-400">{o.contact.email}</p>
                      </td>
                      <td className="py-3 pr-4 text-ink-600">{dateTime(o.createdAt)}</td>
                      <td className="py-3 pr-4 font-semibold text-ink-900">{rupees(o.totals.total)}</td>
                      <td className="py-3">
                        <div className="flex flex-wrap gap-1.5">
                          <StatusPill status={o.status} />
                          {o.status === 'cancelled' && o.paidAt && !o.refundedAt && <Pill tone="new">Refund needed</Pill>}
                          {o.refundedAt && <Pill tone="muted">Refunded</Pill>}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </LoadState>
        <div className="mt-4 flex justify-between">
          <button type="button" className={btn.secondary} disabled={page <= 1} onClick={() => update({ page: String(page - 1) })}>
            ← Newer
          </button>
          <button type="button" className={btn.secondary} disabled={(data?.orders.length ?? 0) < 50} onClick={() => update({ page: String(page + 1) })}>
            Older →
          </button>
        </div>
      </Panel>
    </>
  )
}

// -------------------------------------------------------------- detail --
export function OrderDetail() {
  const { id } = useParams()
  const { data, error, loading, reload } = useApi(`/admin/orders/${id}`)
  const o = data?.order

  return (
    <>
      <PageTitle
        title={`Order #${id}`}
        subtitle={o && `Placed ${dateTime(o.createdAt)}${o.paidAt ? ` · paid ${dateTime(o.paidAt)}` : ''}`}
        action={<Link to="/admin/orders" className={btn.link}>← All orders</Link>}
      />
      <LoadState loading={loading} error={error}>
        {o && (
          <div className="grid gap-5 xl:grid-cols-[1.4fr_1fr]">
            <div className="grid gap-5">
              <Panel title="Items">
                <ul className="divide-y divide-black/5 text-sm">
                  {o.items.map((i) => (
                    <li key={i.productId} className="flex justify-between gap-4 py-2">
                      <span>
                        <Link to={`/admin/products/${i.productId}`} className="text-ink-900 hover:text-brand-700">{i.name}</Link>{' '}
                        <span className="text-ink-400">× {i.qty}</span>
                      </span>
                      <span className="font-medium">{rupees(i.unitPrice * i.qty)}</span>
                    </li>
                  ))}
                </ul>
                <dl className="mt-3 space-y-1 border-t border-black/5 pt-3 text-sm">
                  {[
                    ['Subtotal', o.totals.subtotal],
                    [`Shipping (${o.shippingMethod})`, o.totals.shipping],
                    ['GST', o.totals.tax],
                  ].map(([k, v]) => (
                    <div key={k} className="flex justify-between text-ink-600">
                      <dt>{k}</dt>
                      <dd>{rupees(v)}</dd>
                    </div>
                  ))}
                  <div className="flex justify-between pt-1 font-semibold text-ink-900">
                    <dt>Total</dt>
                    <dd>{rupees(o.totals.total)}</dd>
                  </div>
                </dl>
              </Panel>

              <Panel title="Timeline">
                <ol className="space-y-3 text-sm">
                  {o.events.map((e, i) => (
                    <li key={i} className="flex gap-3">
                      <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand-600" />
                      <div>
                        <p className="font-semibold text-ink-900">{ORDER_STATUS[e.status]?.label ?? e.status.replace(/_/g, ' ')}</p>
                        <p className="text-xs text-ink-400">
                          {dateTime(e.at)}
                          {e.note ? ` · ${e.note}` : ''}
                        </p>
                      </div>
                    </li>
                  ))}
                </ol>
              </Panel>
            </div>

            <div className="grid content-start gap-5">
              <Panel title="Status" action={<StatusPill status={o.status} />}>
                <StatusForm order={o} onDone={reload} />
              </Panel>

              {o.status === 'cancelled' && o.paidAt && <RefundPanel order={o} onDone={reload} />}

              <Panel title="Customer">
                <p className="font-semibold text-ink-900">{o.contact.name}</p>
                <p className="text-sm text-ink-600">
                  <a href={`mailto:${o.contact.email}`} className="hover:text-brand-700">{o.contact.email}</a> ·{' '}
                  <a href={`tel:${o.contact.phone}`} className="hover:text-brand-700">{o.contact.phone}</a>
                </p>
                <p className="mt-3 text-sm text-ink-600">
                  {o.shippingAddress.line1}
                  {o.shippingAddress.line2 ? `, ${o.shippingAddress.line2}` : ''}
                  <br />
                  {o.shippingAddress.city}, {o.shippingAddress.state} {o.shippingAddress.pin}
                </p>
                {o.notes && <p className="mt-3 rounded-lg bg-surface-soft p-3 text-sm text-ink-900">Note: {o.notes}</p>}
              </Panel>

              <Panel title="Payment" action={o.invoiceNo && <InvoiceButton path={`/admin/orders/${o.id}/invoice`} label={o.invoiceNo} />}>
                <dl className="space-y-1 text-sm text-ink-600">
                  <div className="flex justify-between gap-3"><dt>Provider</dt><dd className="text-ink-900">{o.paymentProvider}</dd></div>
                  <div className="flex justify-between gap-3"><dt>Order</dt><dd className="truncate text-ink-900">{o.paymentOrderId ?? '—'}</dd></div>
                  <div className="flex justify-between gap-3"><dt>Payment</dt><dd className="truncate text-ink-900">{o.paymentId ?? '—'}</dd></div>
                </dl>
              </Panel>
            </div>
          </div>
        )}
      </LoadState>
    </>
  )
}

function StatusForm({ order, onDone }) {
  const current = FLOW.indexOf(order.status)
  const nextStatus = current >= 0 && current < FLOW.length - 1 ? FLOW[current + 1] : null
  const [status, setStatus] = useState(nextStatus ?? order.status)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  if (current === -1) {
    return <p className="text-sm text-ink-600">{order.status === 'cancelled' ? 'This order is cancelled.' : 'Waiting for payment — nothing to fulfil yet.'}</p>
  }

  const submit = async (e) => {
    e.preventDefault()
    const d = Object.fromEntries([...new FormData(e.currentTarget)].filter(([, v]) => v !== ''))
    if (status === 'cancelled' && !window.confirm('Cancel this order and return its items to stock? Refund the payment in Razorpay afterwards.')) return
    setBusy(true)
    setError('')
    try {
      await api.post(`/admin/orders/${order.id}/status`, { status, note: d.note, courier: d.courier, trackingNumber: d.trackingNumber, notifyCustomer: d.notify === 'on' })
      onDone()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-3">
      <Field label="Move to" id="st-status">
        <select id="st-status" className="field" value={status} onChange={(e) => setStatus(e.target.value)}>
          {FLOW.slice(current + 1).map((s) => (
            <option key={s} value={s}>
              {ORDER_STATUS[s].label}
            </option>
          ))}
          <option value="cancelled">Cancel order</option>
        </select>
      </Field>
      {(status === 'shipped' || status === 'out_for_delivery') && (
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Courier" id="st-courier" name="courier" defaultValue={order.courier ?? ''} placeholder="e.g. Delhivery" />
          <Field label="Tracking number" id="st-track" name="trackingNumber" defaultValue={order.trackingNumber ?? ''} />
        </div>
      )}
      <Field label="Note (shown on the tracking page)" id="st-note" name="note" placeholder="Optional" />
      <label className="flex items-center gap-2 text-sm text-ink-900">
        <input type="checkbox" name="notify" defaultChecked className="h-4 w-4 accent-brand-600" /> Email the customer
      </label>
      {error && <p role="alert" className="text-sm font-medium text-navy-800">{error}</p>}
      <button type="submit" disabled={busy} className={status === 'cancelled' ? btn.danger : btn.primary}>
        {busy ? 'Saving…' : status === 'cancelled' ? 'Cancel order' : `Mark as ${ORDER_STATUS[status]?.label.toLowerCase()}`}
      </button>
    </form>
  )
}

function RefundPanel({ order, onDone }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [manual, setManual] = useState(false)

  if (order.refundedAt) {
    return (
      <Panel title="Refund">
        <p className="text-sm text-ink-600">
          {order.refundNote === 'processing' ? 'Refund in progress…' : `Refunded ${dateTime(order.refundedAt)}`}
          {order.refundNote && order.refundNote !== 'processing' ? ` · ${order.refundNote}` : ''}
        </p>
      </Panel>
    )
  }

  const run = async (fn) => {
    setBusy(true)
    setError('')
    try {
      await fn()
      onDone()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }
  const refundNow = () => {
    if (!window.confirm(`Refund ${rupees(order.totals.total)} to ${order.contact.name} through Razorpay? This can't be undone.`)) return
    run(() => api.post(`/admin/orders/${order.id}/refund`, {}))
  }
  const record = (e) => {
    e.preventDefault()
    const note = new FormData(e.currentTarget).get('note') || undefined
    run(() => api.post(`/admin/orders/${order.id}/refunded`, { note }))
  }

  return (
    <Panel title="Refund needed">
      <div className="grid gap-3">
        {order.refundNote?.startsWith('failed') && (
          <p role="alert" className="rounded-lg bg-surface-soft p-3 text-sm font-medium text-navy-800">
            The last refund attempt failed ({order.refundNote.replace('failed: ', '')}). Try again, or contact the customer.
          </p>
        )}
        <p className="text-sm text-ink-600">
          Returns {rupees(order.totals.total)} to the customer's original payment method (payment{' '}
          <span className="font-semibold text-ink-900">{order.paymentId ?? '—'}</span>). They get an email; it usually arrives in 5–7 working days.
        </p>
        {error && <p role="alert" className="text-sm font-medium text-navy-800">{error}</p>}
        <button type="button" disabled={busy || !order.paymentId} onClick={refundNow} className={btn.primary}>
          {busy ? 'Refunding…' : `Refund ${rupees(order.totals.total)} to customer`}
        </button>

        {!manual ? (
          <button type="button" className={btn.link} onClick={() => setManual(true)}>
            Already refunded another way? Record it
          </button>
        ) : (
          <form onSubmit={record} className="grid gap-3 border-t border-black/5 pt-3">
            <Field label="Refund reference (optional)" id="rf-note" name="note" placeholder="rfnd_… or bank reference" />
            <button type="submit" disabled={busy} className={btn.secondary}>
              {busy ? 'Saving…' : 'Mark as refunded'}
            </button>
          </form>
        )}
      </div>
    </Panel>
  )
}

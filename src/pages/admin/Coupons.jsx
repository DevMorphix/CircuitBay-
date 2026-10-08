import { useState } from 'react'
import { api, fieldErrors } from '../../lib/api.js'
import { useApi } from '../../lib/useApi.js'
import { FormError } from '../../components/ui/FormBits.jsx'
import { Empty, Field, LoadState, PageTitle, Panel, Pill } from './ui.jsx'
import { btn, rupees } from './format.js'

// Dates are picked as whole days in India time: a coupon starts at 00:00
// IST on its start date and ends at 23:59 IST on its end date.
const IST_MS = 5.5 * 3_600_000
const toDay = (ms) => (ms ? new Date(ms + IST_MS).toISOString().slice(0, 10) : '')
const fromDay = (day, end) => (day ? new Date(`${day}T${end ? '23:59:59' : '00:00:00'}+05:30`).getTime() : null)
const numOrNull = (v) => (v === '' || v == null ? null : Number(v))

const EMPTY = { code: '', description: '', kind: 'percent', value: '10', maxDiscount: '', minSubtotal: '0', startsAt: '', endsAt: '', maxUses: '', perCustomer: '1', active: true }

const toForm = (c) => ({
  code: c.code,
  description: c.description ?? '',
  kind: c.kind,
  value: String(c.value),
  maxDiscount: c.maxDiscount == null ? '' : String(c.maxDiscount),
  minSubtotal: String(c.minSubtotal),
  startsAt: toDay(c.startsAt),
  endsAt: toDay(c.endsAt),
  maxUses: c.maxUses == null ? '' : String(c.maxUses),
  perCustomer: c.perCustomer == null ? '' : String(c.perCustomer),
  active: c.active,
})

const summary = (c) => (c.kind === 'percent' ? `${c.value}% off${c.maxDiscount ? `, up to ${rupees(c.maxDiscount)}` : ''}` : c.kind === 'amount' ? `${rupees(c.value)} off` : 'Free shipping')

function status(c, now) {
  if (!c.active) return <Pill tone="muted">Off</Pill>
  if (c.endsAt && now > c.endsAt) return <Pill tone="muted">Expired</Pill>
  if (c.startsAt && now < c.startsAt) return <Pill tone="active">Scheduled</Pill>
  if (c.maxUses != null && c.usedCount >= c.maxUses) return <Pill tone="done">Used up</Pill>
  return <Pill tone="new">Live</Pill>
}

export function Coupons() {
  const { data, error, loading, reload } = useApi('/admin/coupons')
  const [editing, setEditing] = useState(null) // null | 'new' | coupon
  const [now] = useState(() => Date.now())

  return (
    <>
      <PageTitle
        title="Coupons"
        subtitle="Discounts come off item prices before GST. Uses count paid orders; abandoned checkouts give their use back."
        action={
          <button type="button" className={btn.primary} onClick={() => setEditing('new')}>
            + New coupon
          </button>
        }
      />

      {editing && (
        <CouponEditor
          key={editing === 'new' ? 'new' : editing.code}
          coupon={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null)
            reload()
          }}
        />
      )}

      <Panel>
        <LoadState loading={loading} error={error}>
          {data?.coupons.length === 0 ? (
            <Empty>No coupons yet.</Empty>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="text-xs uppercase tracking-wider text-ink-400">
                  <tr>
                    <th className="py-2 pr-4">Code</th>
                    <th className="py-2 pr-4">Discount</th>
                    <th className="py-2 pr-4">Rules</th>
                    <th className="py-2 pr-4">Paid orders</th>
                    <th className="py-2 pr-4">Discount given</th>
                    <th className="py-2">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/5">
                  {data?.coupons.map((c) => (
                    <tr key={c.code} className="hover:bg-surface-soft">
                      <td className="py-3 pr-4">
                        <button type="button" onClick={() => setEditing(c)} className="font-mono font-semibold text-brand-700 hover:underline">
                          {c.code}
                        </button>
                        {c.description && <p className="text-xs text-ink-400">{c.description}</p>}
                      </td>
                      <td className="py-3 pr-4 text-ink-900">{summary(c)}</td>
                      <td className="py-3 pr-4 text-xs text-ink-600">
                        {[
                          c.minSubtotal > 0 && `Min ${rupees(c.minSubtotal)}`,
                          c.maxUses != null ? `${c.usedCount}/${c.maxUses} used` : `${c.usedCount} used`,
                          c.perCustomer != null && `${c.perCustomer}× per customer`,
                          (c.startsAt || c.endsAt) && `${toDay(c.startsAt) || '…'} → ${toDay(c.endsAt) || '…'}`,
                        ]
                          .filter(Boolean)
                          .join(' · ')}
                      </td>
                      <td className="py-3 pr-4 text-ink-900">{c.paidOrders}</td>
                      <td className="py-3 pr-4 text-ink-900">{rupees(c.discountGiven)}</td>
                      <td className="py-3">{status(c, now)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </LoadState>
      </Panel>
    </>
  )
}

function CouponEditor({ coupon, onClose, onSaved }) {
  const [f, setF] = useState(() => (coupon ? toForm(coupon) : EMPTY))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [fe, setFe] = useState({})
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }))

  async function save(e) {
    e.preventDefault()
    setBusy(true)
    setError('')
    setFe({})
    const body = {
      description: f.description.trim() || null,
      kind: f.kind,
      value: f.kind === 'free_shipping' ? 0 : Number(f.value),
      maxDiscount: f.kind === 'percent' ? numOrNull(f.maxDiscount) : null,
      minSubtotal: Number(f.minSubtotal) || 0,
      startsAt: fromDay(f.startsAt, false),
      endsAt: fromDay(f.endsAt, true),
      maxUses: numOrNull(f.maxUses),
      perCustomer: numOrNull(f.perCustomer),
      active: f.active,
    }
    try {
      if (coupon) await api.put(`/admin/coupons/${encodeURIComponent(coupon.code)}`, body)
      else await api.post('/admin/coupons', { ...body, code: f.code })
      onSaved()
    } catch (err) {
      setError(err.message)
      setFe(fieldErrors(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Panel title={coupon ? `Edit ${coupon.code}` : 'New coupon'} className="mb-6">
      <form onSubmit={save} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Field
          label="Code"
          id="cp-code"
          value={f.code}
          onChange={set('code')}
          required
          disabled={Boolean(coupon)}
          hint={coupon ? "Codes can't be changed." : 'Letters, numbers, - or _'}
          error={fe.code}
          className="font-mono uppercase"
          maxLength={30}
        />
        <Field label="Type" id="cp-kind" error={fe.kind}>
          <select id="cp-kind" className="field" value={f.kind} onChange={set('kind')}>
            <option value="percent">Percent off</option>
            <option value="amount">Rupees off</option>
            <option value="free_shipping">Free shipping</option>
          </select>
        </Field>
        {f.kind !== 'free_shipping' && (
          <Field
            label={f.kind === 'percent' ? 'Percent off' : 'Rupees off'}
            id="cp-value"
            type="number"
            min="1"
            max={f.kind === 'percent' ? 100 : undefined}
            step={f.kind === 'percent' ? 1 : 0.01}
            value={f.value}
            onChange={set('value')}
            required
            error={fe.value}
          />
        )}
        {f.kind === 'percent' && (
          <Field label="Max discount (₹)" id="cp-max" type="number" min="1" step="0.01" value={f.maxDiscount} onChange={set('maxDiscount')} hint="Optional cap" error={fe.maxDiscount} />
        )}
        <Field label="Min order (₹, before GST)" id="cp-min" type="number" min="0" step="0.01" value={f.minSubtotal} onChange={set('minSubtotal')} error={fe.minSubtotal} />
        <Field label="Total uses" id="cp-uses" type="number" min="1" step="1" value={f.maxUses} onChange={set('maxUses')} hint="Empty = unlimited" error={fe.maxUses} />
        <Field label="Uses per customer" id="cp-per" type="number" min="1" step="1" value={f.perCustomer} onChange={set('perCustomer')} hint="By email · empty = unlimited" error={fe.perCustomer} />
        <Field label="Starts" id="cp-start" type="date" value={f.startsAt} onChange={set('startsAt')} hint="Optional" error={fe.startsAt} />
        <Field label="Ends (inclusive)" id="cp-end" type="date" value={f.endsAt} onChange={set('endsAt')} hint="Optional" error={fe.endsAt} />
        <Field label="Note (internal)" id="cp-desc" value={f.description} onChange={set('description')} maxLength={200} className="sm:col-span-2" />
        <label className="flex items-center gap-2 self-end pb-2 text-sm font-medium text-ink-900">
          <input type="checkbox" checked={f.active} onChange={set('active')} className="h-4 w-4 accent-brand-600" /> Active
        </label>
        <div className="flex flex-wrap items-center gap-3 sm:col-span-2 lg:col-span-4">
          <button type="submit" className={btn.primary} disabled={busy}>
            {busy ? 'Saving…' : coupon ? 'Save changes' : 'Create coupon'}
          </button>
          <button type="button" className={btn.secondary} onClick={onClose}>
            Cancel
          </button>
          <FormError message={error} />
        </div>
      </form>
    </Panel>
  )
}

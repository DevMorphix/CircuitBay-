import { useState } from 'react'
import { Link, Navigate, useLocation } from 'react-router-dom'
import { PageShell } from '../components/layout/PageShell.jsx'
import { PageHero, Section } from '../components/ui/Section.jsx'
import { Button } from '../components/ui/Button.jsx'
import { Icon } from '../components/ui/Icon.jsx'
import { FieldError, FormError, FormSent } from '../components/ui/FormBits.jsx'
import { ProductCard } from '../components/shop/ProductCard.jsx'
import { InvoiceButton } from '../components/shop/InvoiceButton.jsx'
import { brand } from '../content/siteContent.js'
import { formatPrice } from '../content/shopData.js'
import { STATE_NAMES } from '../content/indianStates.js'
import { useAuth } from '../context/AuthContext.jsx'
import { api, fieldErrors } from '../lib/api.js'
import { useApi } from '../lib/useApi.js'

const TABS = [
  { id: 'orders', label: 'Orders', icon: 'box' },
  { id: 'addresses', label: 'Addresses', icon: 'pin' },
  { id: 'wishlist', label: 'Wishlist', icon: 'heart' },
  { id: 'profile', label: 'Profile', icon: 'user' },
  { id: 'community', label: 'Community', icon: 'users' },
]

const STATUS_LABEL = {
  placed: 'Placed',
  confirmed: 'Confirmed',
  packed: 'Packed',
  shipped: 'Shipped',
  out_for_delivery: 'Out for delivery',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
  payment_failed: 'Payment failed',
}

// C8 — Orders · Addresses · Wishlist · Profile · Community link (signed-in only).
export function Account() {
  const { user, status, logout } = useAuth()
  const { pathname } = useLocation()
  const [tab, setTab] = useState('orders')

  if (status === 'signed-out') return <Navigate to={`/login?next=${encodeURIComponent(pathname)}`} replace />

  return (
    <PageShell shop seo={{ title: 'My account', path: '/account', noindex: true }}>
      <PageHero compact eyebrow="MY ACCOUNT" title={user?.name ? `Welcome back, ${user.name.split(' ')[0]}.` : 'Welcome back, builder.'} />

      <Section tone="soft" className="pt-10!">
        {status === 'loading' ? (
          <p className="text-ink-600" aria-busy="true">Loading your account…</p>
        ) : (
          <div className="grid gap-8 lg:grid-cols-[220px_1fr]">
            <nav aria-label="Account sections" className="flex gap-2 overflow-x-auto lg:flex-col">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTab(t.id)}
                  aria-current={tab === t.id ? 'page' : undefined}
                  className={`flex shrink-0 items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition-colors ${
                    tab === t.id ? 'bg-brand-600 text-white' : 'bg-white text-ink-600 shadow-sm hover:text-brand-700'
                  }`}
                >
                  <Icon name={t.icon} size={18} /> {t.label}
                </button>
              ))}
              <button type="button" onClick={logout} className="flex shrink-0 items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-ink-600 hover:text-brand-700">
                <Icon name="return" size={18} /> Sign out
              </button>
            </nav>

            <div className="card min-h-[320px] p-6 sm:p-8">
              {tab === 'orders' && <Orders />}
              {tab === 'addresses' && <Addresses />}
              {tab === 'wishlist' && <Wishlist />}
              {tab === 'profile' && <Profile />}
              {tab === 'community' && (
                <div className="flex flex-col items-start gap-4">
                  <h2 className="font-heading text-xl font-semibold text-ink-900">Your community profile</h2>
                  <p className="text-ink-600">Share builds, ask questions and follow other makers on the community site.</p>
                  <Button href={brand.communityUrl} target="_blank" rel="noopener noreferrer">
                    Open community →
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}
      </Section>
    </PageShell>
  )
}

function Loading({ error }) {
  return error ? <FormError message={error.message} /> : <p className="mt-6 text-ink-600" aria-busy="true">Loading…</p>
}

// ------------------------------------------------------------- orders --
function Orders() {
  const { data, error, loading } = useApi('/me/orders')
  return (
    <>
      <h2 className="font-heading text-xl font-semibold text-ink-900">Your orders</h2>
      {loading || error ? (
        <Loading error={error} />
      ) : data.orders.length === 0 ? (
        <>
          <p className="mt-6 text-ink-600">No orders yet.</p>
          <Button to="/shop" className="mt-6">
            Browse the bay
          </Button>
        </>
      ) : (
        <ul className="mt-6 divide-y divide-black/5">
          {data.orders.map((o) => (
            <li key={o.id} className="flex flex-wrap items-center justify-between gap-3 py-4">
              <div>
                <p className="font-semibold text-ink-900">#{o.id}</p>
                <p className="text-sm text-ink-400">
                  {new Date(o.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} · {formatPrice(o.totals.total)}
                </p>
              </div>
              <span className="chip">{STATUS_LABEL[o.status] ?? o.status}</span>
              <div className="flex gap-2">
                {o.invoiceNo && <InvoiceButton path={`/me/orders/${o.id}/invoice`} />}
                {o.creditNoteNo && <InvoiceButton path={`/me/orders/${o.id}/credit-note`} label="Credit note" />}
                <Button to={`/shop/track?order=${o.id}`} variant="secondary" className="px-4! py-2!">
                  Track
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}

// ---------------------------------------------------------- addresses --
function Addresses() {
  const { data, error, loading, reload } = useApi('/me/addresses')
  const [adding, setAdding] = useState(false)
  const [formError, setFormError] = useState({ message: '', fields: {} })
  const [busy, setBusy] = useState(false)

  const save = async (e) => {
    e.preventDefault()
    const d = Object.fromEntries([...new FormData(e.currentTarget)].filter(([, v]) => v !== ''))
    setBusy(true)
    try {
      await api.post('/me/addresses', { ...d, isDefault: d.isDefault === 'on' })
      setAdding(false)
      setFormError({ message: '', fields: {} })
      reload()
    } catch (err) {
      setFormError({ message: err.message, fields: fieldErrors(err) })
    } finally {
      setBusy(false)
    }
  }
  const remove = async (id) => {
    await api.del(`/me/addresses/${id}`).catch(() => {})
    reload()
  }

  const fe = formError.fields
  return (
    <>
      <div className="flex items-center justify-between gap-4">
        <h2 className="font-heading text-xl font-semibold text-ink-900">Saved addresses</h2>
        {!adding && (
          <Button variant="secondary" className="px-4! py-2!" onClick={() => setAdding(true)}>
            <Icon name="plus" size={16} /> Add address
          </Button>
        )}
      </div>

      {adding && (
        <form onSubmit={save} className="mt-6 grid gap-4 rounded-xl border border-black/10 p-5 sm:grid-cols-2">
          <AField id="ad-label" name="label" label="Label (e.g. Home, Hostel)" />
          <AField id="ad-name" name="name" label="Full name" required error={fe.name} />
          <AField id="ad-phone" name="phone" label="Mobile number" type="tel" required error={fe.phone} />
          <AField id="ad-pin" name="pin" label="PIN code" inputMode="numeric" pattern="[0-9]{6}" required error={fe.pin} />
          <AField id="ad-line1" name="line1" label="Address" required className="sm:col-span-2" error={fe.line1} />
          <AField id="ad-line2" name="line2" label="Apartment, landmark (optional)" className="sm:col-span-2" />
          <AField id="ad-city" name="city" label="City" required error={fe.city} />
          <div>
            <label htmlFor="ad-state" className="mb-1.5 block text-sm font-medium text-ink-900">
              State
            </label>
            <select id="ad-state" name="state" required defaultValue="" className="field" aria-invalid={Boolean(fe.state)}>
              <option value="" disabled>
                Choose your state
              </option>
              {STATE_NAMES.map((n) => (
                <option key={n}>{n}</option>
              ))}
            </select>
            <FieldError message={fe.state} />
          </div>
          <label className="flex items-center gap-2 text-sm text-ink-900 sm:col-span-2">
            <input type="checkbox" name="isDefault" className="h-4 w-4 accent-brand-600" /> Make this my default address
          </label>
          <div className="space-y-3 sm:col-span-2">
            <FormError message={formError.message} />
            <div className="flex gap-3">
              <Button type="submit" disabled={busy}>
                {busy ? 'Saving…' : 'Save address'}
              </Button>
              <Button type="button" variant="secondary" onClick={() => setAdding(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </form>
      )}

      {loading || error ? (
        <Loading error={error} />
      ) : data.addresses.length === 0 && !adding ? (
        <p className="mt-6 text-ink-600">No saved addresses yet.</p>
      ) : (
        <ul className="mt-6 grid gap-4 sm:grid-cols-2">
          {data.addresses.map((a) => (
            <li key={a.id} className="rounded-xl border border-black/10 p-5 text-sm text-ink-600">
              <p className="flex items-center gap-2 font-semibold text-ink-900">
                {a.label ?? a.name} {a.isDefault && <span className="chip">Default</span>}
              </p>
              <p className="mt-1">
                {a.name}, {a.line1}
                {a.line2 ? `, ${a.line2}` : ''}, {a.city}, {a.state} {a.pin}
              </p>
              <p>{a.phone}</p>
              <button type="button" onClick={() => remove(a.id)} className="mt-3 text-xs font-semibold text-ink-400 hover:text-brand-700">
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}

function AField({ id, label, className = '', error, ...rest }) {
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-ink-900">
        {label}
      </label>
      <input id={id} className="field" aria-invalid={Boolean(error)} {...rest} />
      <FieldError message={error} />
    </div>
  )
}

// ----------------------------------------------------------- wishlist --
function Wishlist() {
  const { data, error, loading } = useApi('/me/wishlist')
  return (
    <>
      <h2 className="font-heading text-xl font-semibold text-ink-900">Wishlist</h2>
      {loading || error ? (
        <Loading error={error} />
      ) : data.products.length === 0 ? (
        <p className="mt-6 text-ink-600">
          Nothing saved yet. Tap the heart on any <Link to="/shop" className="font-semibold text-brand-700">product</Link> to keep it here.
        </p>
      ) : (
        <div className="mt-6 grid grid-cols-2 gap-4 xl:grid-cols-3">
          {data.products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </>
  )
}

// ------------------------------------------------------------ profile --
function Profile() {
  const { user, setUser } = useAuth()
  const [saved, setSaved] = useState('')
  const [err, setErr] = useState({ message: '', fields: {} })

  const saveProfile = async (e) => {
    e.preventDefault()
    const d = Object.fromEntries([...new FormData(e.currentTarget)].filter(([, v]) => v !== ''))
    try {
      const r = await api.patch('/me/profile', d)
      setUser(r.user)
      setSaved('profile')
      setErr({ message: '', fields: {} })
    } catch (e2) {
      setErr({ message: e2.message, fields: fieldErrors(e2) })
    }
  }
  const changePassword = async (e) => {
    e.preventDefault()
    const form = e.currentTarget
    const d = Object.fromEntries(new FormData(form))
    try {
      await api.post('/auth/password/change', { currentPassword: d.currentPassword || undefined, newPassword: d.newPassword })
      form.reset()
      setSaved('password')
      setErr({ message: '', fields: {} })
    } catch (e2) {
      setErr({ message: e2.message, fields: fieldErrors(e2) })
    }
  }

  return (
    <div className="grid max-w-lg gap-10">
      <form className="grid gap-4" onSubmit={saveProfile}>
        <h2 className="font-heading text-xl font-semibold text-ink-900">Profile</h2>
        <AField id="pf-name" name="name" label="Name" defaultValue={user?.name ?? ''} error={err.fields.name} />
        <AField id="pf-email" name="email" type="email" label="Email" defaultValue={user?.email ?? ''} error={err.fields.email} />
        {user?.phone && <p className="text-sm text-ink-600">Mobile: {user.phone}</p>}
        {saved === 'profile' && <FormSent>Profile saved.</FormSent>}
        <div>
          <Button type="submit">Save changes</Button>
        </div>
      </form>

      <form className="grid gap-4" onSubmit={changePassword}>
        <h2 className="font-heading text-xl font-semibold text-ink-900">Password</h2>
        <AField id="pf-cur" name="currentPassword" type="password" label="Current password (leave empty if you signed up by phone)" autoComplete="current-password" />
        <AField id="pf-new" name="newPassword" type="password" label="New password (8+ characters)" autoComplete="new-password" minLength={8} required error={err.fields.newPassword} />
        {saved === 'password' && <FormSent>Password updated. Other devices were signed out.</FormSent>}
        <FormError message={err.message} />
        <div>
          <Button type="submit" variant="secondary">
            Change password
          </Button>
        </div>
      </form>
    </div>
  )
}

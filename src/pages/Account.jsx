import { useState } from 'react'
import { PageShell } from '../components/layout/PageShell.jsx'
import { PageHero, Section } from '../components/ui/Section.jsx'
import { Button } from '../components/ui/Button.jsx'
import { Icon } from '../components/ui/Icon.jsx'
import { ProductCard } from '../components/shop/ProductCard.jsx'
import { brand } from '../content/siteContent.js'
import { getProduct } from '../content/shopData.js'

const TABS = [
  { id: 'orders', label: 'Orders', icon: 'box' },
  { id: 'addresses', label: 'Addresses', icon: 'pin' },
  { id: 'wishlist', label: 'Wishlist', icon: 'heart' },
  { id: 'profile', label: 'Profile', icon: 'user' },
  { id: 'community', label: 'Community', icon: 'users' },
]

// C8 — Orders · Addresses · Wishlist · Profile · Community link.
// TODO_CLIENT: requires auth + order backend; contents below are samples.
export function Account() {
  const [tab, setTab] = useState('orders')

  return (
    <PageShell shop seo={{ title: 'My account', path: '/account', noindex: true }}>
      <PageHero compact eyebrow="MY ACCOUNT" title="Welcome back, builder." />

      <Section tone="soft" className="pt-10!">
        <div className="grid gap-8 lg:grid-cols-[220px_1fr]">
          <nav aria-label="Account sections" className="flex gap-2 overflow-x-auto lg:flex-col">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                aria-current={tab === t.id ? 'page' : undefined}
                className={`flex shrink-0 items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition-colors ${
                  tab === t.id ? 'bg-brand-600 text-white' : 'bg-white text-ink-600 shadow-sm hover:text-brand-600'
                }`}
              >
                <Icon name={t.icon} size={18} /> {t.label}
              </button>
            ))}
          </nav>

          <div className="card min-h-[320px] p-6 sm:p-8">
            {tab === 'orders' && (
              <>
                <h2 className="font-heading text-xl font-semibold text-ink-900">Your orders</h2>
                <ul className="mt-6 divide-y divide-black/5">
                  {[
                    { id: 'CB10482211', date: '12 Sep 2026', status: 'Delivered', total: '₹1,499' },
                    { id: 'CB10479032', date: '28 Aug 2026', status: 'Shipped', total: '₹548' },
                  ].map((o) => (
                    <li key={o.id} className="flex flex-wrap items-center justify-between gap-3 py-4">
                      <div>
                        <p className="font-semibold text-ink-900">#{o.id}</p>
                        <p className="text-sm text-ink-400">{o.date} · {o.total}</p>
                      </div>
                      <span className="chip">{o.status}</span>
                      <Button to={`/shop/track?order=${o.id}`} variant="secondary" className="px-4! py-2!">
                        Track
                      </Button>
                    </li>
                  ))}
                </ul>
              </>
            )}
            {tab === 'addresses' && (
              <>
                <h2 className="font-heading text-xl font-semibold text-ink-900">Saved addresses</h2>
                <div className="mt-6 rounded-xl border border-black/10 p-5 text-sm text-ink-600">
                  <p className="font-semibold text-ink-900">Home</p>
                  <p className="mt-1">No saved addresses yet — add one at checkout.</p>
                </div>
              </>
            )}
            {tab === 'wishlist' && (
              <>
                <h2 className="font-heading text-xl font-semibold text-ink-900">Wishlist</h2>
                <div className="mt-6 grid grid-cols-2 gap-4 xl:grid-cols-3">
                  {['esp32-cam', 'vl53l0x', 'soldering-kit'].map((id) => (
                    <ProductCard key={id} product={getProduct(id)} />
                  ))}
                </div>
              </>
            )}
            {tab === 'profile' && (
              <form className="grid max-w-lg gap-4" onSubmit={(e) => e.preventDefault()}>
                <h2 className="font-heading text-xl font-semibold text-ink-900">Profile</h2>
                <label className="text-sm font-medium text-ink-900">
                  Name
                  <input className="field mt-1.5" placeholder="Your name" />
                </label>
                <label className="text-sm font-medium text-ink-900">
                  Email
                  <input type="email" className="field mt-1.5" placeholder="you@email.com" />
                </label>
                <div>
                  <Button type="submit">Save changes</Button>
                </div>
              </form>
            )}
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
      </Section>
    </PageShell>
  )
}

import { useState } from 'react'
import { PageShell } from '../components/layout/PageShell.jsx'
import { PageHero, Section } from '../components/ui/Section.jsx'
import { Button } from '../components/ui/Button.jsx'
import { Icon } from '../components/ui/Icon.jsx'
import { brand } from '../content/siteContent.js'

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
                <p className="mt-6 text-ink-600">No orders yet.</p>
                <Button to="/shop" className="mt-6">
                  Browse the bay
                </Button>
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
                <p className="mt-6 text-ink-600">Nothing saved yet. Tap the heart on any product to keep it here.</p>
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

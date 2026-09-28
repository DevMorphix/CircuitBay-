import { useState } from 'react'
import { PageShell } from '../components/layout/PageShell.jsx'
import { PageHero, Section } from '../components/ui/Section.jsx'
import { Button } from '../components/ui/Button.jsx'
import { Icon } from '../components/ui/Icon.jsx'
import { FaqList } from '../components/content/FaqList.jsx'
import { faqGroups } from '../content/shopData.js'
import { schema } from '../lib/seo.js'

// C9 — search box + accordion grouped by topic; "Still stuck?" footer.
// TODO_CLIENT: confirm every policy answer.
export function Faq() {
  const [q, setQ] = useState('')
  const needle = q.trim().toLowerCase()
  const groups = faqGroups
    .map((g) => ({ ...g, items: g.items.filter((i) => !needle || `${i.q} ${i.a}`.toLowerCase().includes(needle)) }))
    .filter((g) => g.items.length)

  return (
    <PageShell
      shop
      seo={{
        title: 'Orders, Shipping & Returns FAQ',
        description: 'Answers about payments, delivery across India, returns and refunds, choosing the right kit, and bulk orders for schools — the CircuitBay FAQ.',
        path: '/faq',
        jsonLd: [
          schema.faq(faqGroups.flatMap((g) => g.items)),
          schema.breadcrumbs([{ name: 'Home', path: '/' }, { name: 'FAQ', path: '/faq' }]),
        ],
      }}
    >
      <PageHero compact align="center" eyebrow="HELP" title="Frequently asked questions">
        <form role="search" onSubmit={(e) => e.preventDefault()} className="relative mx-auto mt-8 max-w-xl">
          <label htmlFor="faq-search" className="sr-only">
            Search questions
          </label>
          <Icon name="search" size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-white/50" />
          <input
            id="faq-search"
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search shipping, returns, kits…"
            className="field py-3! pl-11!"
          />
        </form>
      </PageHero>

      <Section tone="soft" width="max-w-3xl">
        {groups.length === 0 && <p className="text-center text-ink-600">No matching questions. Try another word, or contact us below.</p>}
        <div className="space-y-12">
          {groups.map((g) => (
            <section key={g.title} aria-labelledby={`faq-${g.title.toLowerCase().replace(/[^a-z]+/g, '-')}`}>
              <h2 id={`faq-${g.title.toLowerCase().replace(/[^a-z]+/g, '-')}`} className="mb-4 font-heading text-xl font-semibold text-ink-900">
                {g.title}
              </h2>
              <FaqList items={g.items} openAll={Boolean(needle)} />
            </section>
          ))}
        </div>
      </Section>

      <Section tone="dark">
        <div className="flex flex-col items-center gap-6 text-center">
          <h2 className="font-heading text-3xl font-semibold text-white">Still stuck?</h2>
          <Button to="/contact">Contact us</Button>
        </div>
      </Section>
    </PageShell>
  )
}

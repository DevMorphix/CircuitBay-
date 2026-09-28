import { PageShell } from '../components/layout/PageShell.jsx'
import { PageHero, Section } from '../components/ui/Section.jsx'

// Placeholder legal copy. TODO_CLIENT: replace with counsel-reviewed
// policies before launch — this text is a structural stand-in only, not a
// compliant policy.
export function LegalPage({ title, path, description, children }) {
  return (
    <PageShell seo={{ title, path, description: description ?? `${title} for CircuitBay — how we handle orders, data and your use of circuitbay.in.` }}>
      <PageHero eyebrow="LEGAL" title={title} subtitle="Draft placeholder — pending legal review (TODO_CLIENT)" />
      <Section tone="light" width="max-w-3xl">
        <div className="space-y-4 text-sm leading-relaxed text-ink-600 [&_strong]:text-ink-900">{children}</div>
      </Section>
    </PageShell>
  )
}

import { closingCta } from '../../../content/siteContent.js'
import { Section } from '../../ui/Section.jsx'
import { Reveal } from '../../ui/Reveal.jsx'
import { Button } from '../../ui/Button.jsx'
import { CircuitTrace } from '../../ui/CircuitTrace.jsx'

// A7 — navy closer. Reused at the bottom of inner pages via `headline`.
export function ClosingCta({ headline = closingCta.headline, snap = true }) {
  return (
    <Section tone="dark" id="start" snap={snap} className="relative overflow-hidden">
      <Reveal from="scale" className="pointer-events-none absolute inset-x-0 top-10">
        <CircuitTrace state="reconnecting" className="h-12 w-full opacity-60" />
      </Reveal>
      <Reveal from="scale" delay={0.06} className="relative mx-auto max-w-3xl py-10 text-center">
        <h2 className="font-heading text-4xl font-semibold tracking-tight text-white sm:text-6xl">{headline}</h2>
        <div className="mt-10 flex flex-wrap justify-center gap-4">
          <Button
            to={closingCta.primary.to}
            className="tracking-[0.12em]"
            event={{ name: 'cta_click', params: { cta: 'closing_explore' } }}
          >
            {closingCta.primary.label}
          </Button>
          <Button
            to={closingCta.secondary.to}
            variant="secondary-dark"
            className="tracking-[0.12em]"
            event={{ name: 'cta_click', params: { cta: 'closing_start_building' } }}
          >
            {closingCta.secondary.label}
          </Button>
        </div>
      </Reveal>
    </Section>
  )
}

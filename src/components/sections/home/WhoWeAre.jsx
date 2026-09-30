import { whoWeAre } from '../../../content/siteContent.js'
import { Section } from '../../ui/Section.jsx'
import { Reveal } from '../../ui/Reveal.jsx'
import { ArrowLink, Photo } from '../../ui/Card.jsx'

// A1 — light, two columns: copy left, real photo right.
export function WhoWeAre() {
  return (
    <Section tone="light" id="who-we-are" snap>
      <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
        <Reveal from="left">
          <p className="eyebrow mb-4">{whoWeAre.eyebrow}</p>
          <h2 className="font-heading text-3xl font-semibold tracking-tight text-ink-900 sm:text-5xl">
            {whoWeAre.headline}
          </h2>
          {whoWeAre.body.map((p) => (
            <p key={p} className="mt-5 text-base leading-relaxed text-ink-600 sm:text-lg">
              {p}
            </p>
          ))}
          <p className="mt-6 border-l-2 border-brand-500 pl-4 text-sm font-medium text-ink-900">
            {whoWeAre.supporting}
          </p>
          <ArrowLink to={whoWeAre.cta.to} className="mt-8">
            {whoWeAre.cta.label}
          </ArrowLink>
        </Reveal>
        <Reveal from="right" delay={0.1}>
          <Photo label={whoWeAre.photoLabel} className="aspect-[4/3] rounded-2xl shadow-[0_20px_50px_rgba(15,31,69,0.12)]" />
        </Reveal>
      </div>
    </Section>
  )
}

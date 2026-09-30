import { educators } from '../../../content/siteContent.js'
import { Section } from '../../ui/Section.jsx'
import { Reveal } from '../../ui/Reveal.jsx'
import { Card, Photo } from '../../ui/Card.jsx'
import { IconTile } from '../../ui/Icon.jsx'
import { Button } from '../../ui/Button.jsx'

// A4 — navy: copy + CTA left, 2×2 offering cards right, trust + photo strip.
export function ForEducators() {
  return (
    <Section tone="dark" id="educators" snap>
      <div className="grid gap-12 lg:grid-cols-[1fr_1.3fr] lg:gap-16">
        <Reveal from="left" className="lg:sticky lg:top-28 lg:self-start">
          <p className="eyebrow mb-4">{educators.eyebrow}</p>
          <h2 className="font-heading text-3xl font-semibold tracking-tight text-white sm:text-5xl">
            {educators.headline}
          </h2>
          <p className="mt-5 text-base leading-relaxed text-white/70 sm:text-lg">{educators.subhead}</p>
          <div className="mt-8 flex flex-wrap gap-4">
            <Button to={educators.cta.to} event={{ name: 'cta_click', params: { cta: 'educators_request_workshop' } }}>
              {educators.cta.label} →
            </Button>
            <Button to={educators.ctaMore.to} variant="secondary-dark">
              {educators.ctaMore.label}
            </Button>
          </div>
        </Reveal>

        <div className="grid gap-5 sm:grid-cols-2">
          {educators.cards.map((c, i) => (
            <Reveal key={c.title} delay={i * 0.06}>
              <Card dark className="h-full p-7">
                <IconTile name={c.icon} dark />
                <h3 className="mt-5 font-heading text-lg font-semibold text-white">{c.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-white/65">{c.body}</p>
              </Card>
            </Reveal>
          ))}
        </div>
      </div>

      {/* Trust strip: only shown once real figures/logos exist (TODO_CLIENT) */}
      {(educators.trust.stat || educators.trust.logos.length > 0) && (
        <Reveal className="mt-16 flex flex-col items-center gap-6 border-y border-white/10 py-8 md:flex-row md:justify-between">
          {educators.trust.stat && (
            <p className="font-heading text-2xl font-semibold text-white">
              <span className="text-brand-300">{educators.trust.stat}</span> delivered
            </p>
          )}
          <ul className="flex flex-wrap justify-center gap-4">
            {educators.trust.logos.map((logo) => (
              <li key={logo.src}>
                <img src={logo.src} alt={logo.name} loading="lazy" className="h-12 w-auto opacity-80" />
              </li>
            ))}
          </ul>
        </Reveal>
      )}

      <div className="mt-10 grid grid-cols-2 gap-4 md:grid-cols-4">
        {['Workshop in progress', 'Students wiring a build', 'Maker lab', 'Teacher training'].map((label, i) => (
          <Reveal key={label} delay={i * 0.06}>
            <Photo label={label} className="aspect-[4/3] rounded-xl opacity-90" />
          </Reveal>
        ))}
      </div>
    </Section>
  )
}

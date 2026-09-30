import { beliefs, brand } from '../../../content/siteContent.js'
import { Section } from '../../ui/Section.jsx'
import { Reveal } from '../../ui/Reveal.jsx'
import { Card } from '../../ui/Card.jsx'
import { IconTile } from '../../ui/Icon.jsx'
import { CircuitTrace } from '../../ui/CircuitTrace.jsx'

// A2 — navy: large centred quote, 3 value cards, motto strip.
export function Beliefs() {
  return (
    <Section tone="dark" id="beliefs" snap>
      <Reveal from="scale" className="mx-auto max-w-4xl text-center">
        <p className="eyebrow mb-6">{beliefs.eyebrow}</p>
        <blockquote className="font-heading text-3xl font-semibold leading-tight tracking-tight text-white sm:text-5xl">
          “{beliefs.quote}”
        </blockquote>
      </Reveal>

      <div className="mt-16 grid gap-5 md:grid-cols-3">
        {beliefs.cards.map((c, i) => (
          <Reveal key={c.title} delay={i * 0.08}>
            <Card dark className="h-full p-7">
              <IconTile name={c.icon} dark />
              <h3 className="mt-5 font-heading text-xl font-semibold text-white">{c.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-white/65">{c.body}</p>
            </Card>
          </Reveal>
        ))}
      </div>

      <div className="mt-16">
        <Reveal from="scale">
          <CircuitTrace state="reconnecting" className="h-10 w-full" />
        </Reveal>
        <p className="mt-6 text-center font-heading text-2xl font-semibold tracking-wide text-white sm:text-4xl">
          {brand.motto.map((word, i) => (
            <Reveal key={word} as="span" delay={i * 0.08} className={`inline-block ${i === 1 ? 'text-brand-300' : ''}`}>
              {word}&nbsp;
            </Reveal>
          ))}
        </p>
      </div>
    </Section>
  )
}

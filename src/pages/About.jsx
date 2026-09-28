import { PageShell } from '../components/layout/PageShell.jsx'
import { PageHero, Section } from '../components/ui/Section.jsx'
import { Reveal } from '../components/ui/Reveal.jsx'
import { Card, Photo } from '../components/ui/Card.jsx'
import { IconTile } from '../components/ui/Icon.jsx'
import { CountUp } from '../components/ui/CountUp.jsx'
import { useInView } from '../hooks/useInView.js'
import { ClosingCta } from '../components/sections/home/ClosingCta.jsx'
import { about, beliefs } from '../content/siteContent.js'
import { schema } from '../lib/seo.js'

// D1 — OUR STORY text, founder photo + bio, timeline, values, stats strip.
export function About() {
  const [statsRef, statsInView] = useInView({ threshold: 0.5 })

  return (
    <PageShell
      seo={{
        title: 'About CircuitBay — Maker Community & Hardware Store',
        description: 'Born in real classrooms teaching electronics, IoT and AI, CircuitBay is a maker community and hardware store helping students and schools across India build.',
        path: '/about',
        jsonLd: [schema.organization(), schema.breadcrumbs([{ name: 'Home', path: '/' }, { name: 'About', path: '/about' }])],
      }}
    >
      <PageHero eyebrow={about.eyebrow} title={about.headline} />

      <Section tone="light">
        <div className="grid gap-12 lg:grid-cols-[1.4fr_1fr] lg:gap-16">
          <Reveal>
            {/* TODO_CLIENT: client's OUR STORY text, as written */}
            {about.story.map((p) => (
              <p key={p} className="mb-6 text-lg leading-relaxed text-ink-600 first:text-xl first:font-medium first:text-ink-900">
                {p}
              </p>
            ))}
          </Reveal>
          <Reveal delay={0.1}>
            <Card hover={false} className="overflow-hidden">
              <Photo label="Founder photo" className="aspect-[4/5]" />
              <div className="p-6">
                <h2 className="font-heading text-xl font-semibold text-ink-900">{about.founder.name}</h2>
                <p className="text-sm font-medium text-brand-600">{about.founder.role}</p>
                <p className="mt-3 text-sm leading-relaxed text-ink-600">{about.founder.bio}</p>
              </div>
            </Card>
          </Reveal>
        </div>
      </Section>

      {/* Only real, approved figures — hidden until the client supplies them */}
      {about.stats.length > 0 && (
        <section ref={statsRef} className="section-dark px-4 py-16 sm:px-6">
          <div className="mx-auto grid max-w-6xl gap-10 text-center sm:grid-cols-3">
            {about.stats.map((s) => (
              <div key={s.key}>
                <CountUp
                  target={s.value}
                  start={statsInView}
                  suffix={s.suffix}
                  className="font-heading block text-4xl font-semibold text-brand-300 sm:text-5xl"
                />
                <p className="mt-2 text-sm font-medium text-white/65">{s.label}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      <Section tone="soft" eyebrow="THE JOURNEY" title="From one classroom to a bay.">
        <ol className="relative grid gap-6 md:grid-cols-4">
          <span aria-hidden="true" className="absolute left-0 right-0 top-[1.1rem] hidden h-0.5 bg-brand-500/25 md:block" />
          {about.timeline.map((t, i) => (
            <Reveal as="li" key={t.title} delay={i * 0.08} className="relative">
              <span className="node-lit relative z-10 mb-5 block h-4 w-4 rounded-full md:mt-2.5" />
              <p className="eyebrow">{t.year}</p>
              <h3 className="mt-2 font-heading text-lg font-semibold text-ink-900">{t.title}</h3>
              <p className="mt-1 text-sm text-ink-600">{t.body}</p>
            </Reveal>
          ))}
        </ol>
      </Section>

      <Section tone="light" eyebrow="WHAT WE BELIEVE IN" title={beliefs.quote}>
        <div className="grid gap-5 md:grid-cols-3">
          {beliefs.cards.map((c) => (
            <Card key={c.title} className="h-full p-7">
              <IconTile name={c.icon} />
              <h3 className="mt-5 font-heading text-lg font-semibold text-ink-900">{c.title}</h3>
              <p className="mt-2 text-sm text-ink-600">{c.body}</p>
            </Card>
          ))}
        </div>
      </Section>

      <ClosingCta snap={false} />
    </PageShell>
  )
}

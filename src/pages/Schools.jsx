import { PageShell } from '../components/layout/PageShell.jsx'
import { PageHero, Section } from '../components/ui/Section.jsx'
import { Reveal } from '../components/ui/Reveal.jsx'
import { Button } from '../components/ui/Button.jsx'
import { Card, Photo } from '../components/ui/Card.jsx'
import { IconTile } from '../components/ui/Icon.jsx'
import { FaqList } from '../components/content/FaqList.jsx'
import { ClosingCta } from '../components/sections/home/ClosingCta.jsx'
import { schools } from '../content/landingData.js'
import { educators } from '../content/siteContent.js'
import { schema } from '../lib/seo.js'

// Landing page for schools & colleges — targets "Atal Tinkering Lab setup",
// "robotics lab for schools" and workshop searches.
export function Schools() {
  const path = '/schools'
  return (
    <PageShell
      seo={{
        ...schools.seo,
        path,
        jsonLd: [
          schema.service({ name: 'School robotics, STEM & Atal Tinkering Lab setup', description: schools.seo.description, path, serviceType: 'STEM lab setup and training' }),
          schema.faq(schools.faq),
          schema.breadcrumbs([{ name: 'Home', path: '/' }, { name: 'For Schools', path }]),
        ],
      }}
    >
      <PageHero eyebrow={schools.eyebrow} title={schools.headline} subtitle={schools.subhead}>
        <div className="mt-8 flex flex-wrap gap-4">
          <Button to="/contact#workshop">Request a consultation →</Button>
          <Button href="#atl" variant="secondary-dark">
            About Atal Tinkering Labs
          </Button>
        </div>
      </PageHero>

      <Section tone="light" eyebrow="WHAT WE DO" title="Everything a school maker lab needs">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {schools.offerings.map((o, i) => (
            <Reveal key={o.title} delay={(i % 3) * 0.06}>
              <Card hover={false} className="h-full p-7">
                <IconTile name={o.icon} />
                <h3 className="mt-5 font-heading text-lg font-semibold text-ink-900">{o.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-600">{o.body}</p>
              </Card>
            </Reveal>
          ))}
        </div>
      </Section>

      <Section tone="dark" id="atl">
        <div className="grid gap-12 lg:grid-cols-[1.3fr_1fr] lg:items-center">
          <div>
            <p className="eyebrow mb-4">ATAL INNOVATION MISSION</p>
            <h2 className="font-heading text-3xl font-semibold tracking-tight text-white sm:text-4xl">{schools.atl.heading}</h2>
            {schools.atl.paragraphs.map((p) => (
              <p key={p} className="mt-5 leading-relaxed text-white/75">
                {p}
              </p>
            ))}
          </div>
          <Photo label="Students building in a school tinkering lab" className="aspect-[4/3] rounded-2xl" />
        </div>
      </Section>

      <Section tone="soft" eyebrow="HOW IT WORKS" title="From empty room to busy lab in six steps">
        <ol className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {schools.process.map((step, i) => (
            <li key={step.title} className="card p-6">
              <span className="node-lit flex h-9 w-9 items-center justify-center rounded-full font-heading text-sm font-semibold text-white">{i + 1}</span>
              <h3 className="mt-4 font-heading text-lg font-semibold text-ink-900">{step.title}</h3>
              <p className="mt-1 text-sm text-ink-600">{step.body}</p>
            </li>
          ))}
        </ol>
      </Section>

      {/* TODO_CLIENT: real workshop count + school/college logos */}
      <Section tone="light" eyebrow="TRUSTED BY SCHOOLS" title={`${educators.trust.stat} delivered in real classrooms`}>
        <ul className="flex flex-wrap gap-3">
          {educators.trust.logos.map((l, i) => (
            <li key={`${l}-${i}`} className="flex h-14 w-32 items-center justify-center rounded-lg border border-black/10 text-xs font-semibold uppercase tracking-wider text-ink-400">
              {l} logo
            </li>
          ))}
        </ul>
      </Section>

      <Section tone="grey" eyebrow="QUESTIONS" title="Lab setup & workshop FAQ" width="max-w-3xl">
        <FaqList items={schools.faq} />
      </Section>

      <ClosingCta headline="Bring a maker lab to your school." snap={false} />
    </PageShell>
  )
}

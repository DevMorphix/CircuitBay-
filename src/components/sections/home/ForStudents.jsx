import { students } from '../../../content/siteContent.js'
import { Section } from '../../ui/Section.jsx'
import { Reveal } from '../../ui/Reveal.jsx'
import { ArrowText, Card } from '../../ui/Card.jsx'
import { IconTile } from '../../ui/Icon.jsx'
import { Button } from '../../ui/Button.jsx'

// A3 — soft-blue: five feature cards (3 + 2) and a wide CTA banner.
export function ForStudents() {
  return (
    <Section tone="soft" id="students" snap eyebrow={students.eyebrow} title={students.headline} subtitle={students.subhead}>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-6">
        {students.cards.map((c, i) => (
          <Reveal key={c.title} delay={i * 0.06} className={i < 3 ? 'lg:col-span-2' : 'lg:col-span-3'}>
            <Card to={c.to} className="flex h-full flex-col p-7">
              <IconTile name={c.icon} />
              <h3 className="mt-5 font-heading text-lg font-semibold text-ink-900">{c.title}</h3>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-ink-600">{c.body}</p>
              <ArrowText className="mt-5">{c.link}</ArrowText>
            </Card>
          </Reveal>
        ))}
      </div>

      <Reveal>
        <div className="section-dark mt-8 flex flex-col items-start justify-between gap-6 rounded-2xl p-8 sm:flex-row sm:items-center sm:p-10">
          <p className="font-heading text-2xl font-semibold text-white sm:text-3xl">{students.banner.prompt}</p>
          <Button to={students.banner.to} event={{ name: 'cta_click', params: { cta: 'students_start_building' } }}>
            {students.banner.cta} →
          </Button>
        </div>
      </Reveal>
    </Section>
  )
}

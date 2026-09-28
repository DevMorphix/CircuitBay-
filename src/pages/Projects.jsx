import { useState } from 'react'
import { PageShell } from '../components/layout/PageShell.jsx'
import { PageHero, Section } from '../components/ui/Section.jsx'
import { Reveal } from '../components/ui/Reveal.jsx'
import { Button } from '../components/ui/Button.jsx'
import { Photo } from '../components/ui/Card.jsx'
import { Icon } from '../components/ui/Icon.jsx'
import { ProjectCard } from '../components/content/ProjectCard.jsx'
import { brand, projects } from '../content/siteContent.js'
import { trackEvent } from '../lib/analytics.js'
import { schema } from '../lib/seo.js'

// D3 — curated grid from the community site, editor's-pick spotlight,
// "Submit yours" CTA. TODO_CLIENT: pull from the community site API.
export function Projects() {
  const [pick, ...rest] = projects
  const filters = ['All', ...new Set(projects.map((p) => p.category))]
  const [filter, setFilter] = useState('All')
  const shown = rest.filter((p) => filter === 'All' || p.category === filter)

  return (
    <PageShell
      seo={{
        title: 'Student Electronics & IoT Projects — Community',
        description: 'Real electronics, IoT and robotics projects built by students and makers — AirLoo, Vazhikatti, smart agriculture and more. Share your own build.',
        path: '/projects',
        jsonLd: [schema.breadcrumbs([{ name: 'Home', path: '/' }, { name: 'Projects', path: '/projects' }])],
      }}
    >
      <PageHero
        eyebrow="COMMUNITY"
        title="Built by people like you."
        subtitle="Real builds from students, hobbyists and classrooms across the bay."
      />

      <Section tone="light" eyebrow="EDITOR'S PICK">
        <Reveal className="card grid overflow-hidden lg:grid-cols-2">
          <Photo label={`${pick.title} — build photo`} className="aspect-[16/10] lg:aspect-auto" />
          <div className="p-8 sm:p-10">
            <span className="chip">{pick.category}</span>
            <h2 className="mt-4 font-heading text-3xl font-semibold text-ink-900 sm:text-4xl">{pick.title}</h2>
            <p className="mt-4 text-lg leading-relaxed text-ink-600">{pick.blurb}</p>
            <ul className="mt-6 flex flex-wrap gap-2">
              {pick.tags.map((t) => (
                <li key={t} className="rounded-md border border-black/10 px-2.5 py-1 text-xs font-medium text-ink-600">
                  {t}
                </li>
              ))}
            </ul>
            {pick.builder && (
              <p className="mt-6 text-sm text-ink-400">
                Built by <span className="font-semibold text-ink-600">{pick.builder}</span>
              </p>
            )}
          </div>
        </Reveal>
      </Section>

      <Section tone="soft" title="More from the bay">
        <div className="mb-8 flex flex-wrap gap-2" role="group" aria-label="Filter by category">
          {filters.map((f) => (
            <button
              key={f}
              type="button"
              aria-pressed={filter === f}
              onClick={() => setFilter(f)}
              className={`rounded-full px-4 py-2 text-sm font-semibold ${
                filter === f ? 'bg-brand-600 text-white' : 'bg-white text-ink-600 shadow-sm hover:text-brand-600'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((p, i) => (
            <Reveal key={p.id} delay={(i % 3) * 0.06}>
              <ProjectCard project={p} />
            </Reveal>
          ))}
        </div>
        <div className="mt-10 text-center">
          <Button href={brand.communityUrl} variant="secondary" target="_blank" rel="noopener noreferrer">
            See everything on the community site →
          </Button>
        </div>
      </Section>

      <Section tone="dark" id="submit">
        <SubmitForm />
      </Section>
    </PageShell>
  )
}

// TODO_CLIENT: wire to the community site's submission flow
function SubmitForm() {
  const [sent, setSent] = useState(false)
  return (
    <div className="grid gap-10 lg:grid-cols-2">
      <div>
        <p className="eyebrow mb-4">SUBMIT YOURS</p>
        <h2 className="font-heading text-3xl font-semibold text-white sm:text-4xl">Built something? Share it with the bay.</h2>
        <p className="mt-4 text-white/70">Working, half-working or gloriously broken — every build teaches someone something.</p>
      </div>
      {sent ? (
        <p role="status" className="flex items-center gap-3 text-white">
          <Icon name="check" className="text-brand-300" /> Thanks! We'll review it and get in touch.
        </p>
      ) : (
        <form
          className="grid gap-4"
          onSubmit={(e) => {
            e.preventDefault()
            trackEvent('form_submit', { form: 'project_submission' })
            setSent(true)
          }}
        >
          <label className="sr-only" htmlFor="p-title">Project name</label>
          <input id="p-title" required placeholder="Project name" className="field" />
          <label className="sr-only" htmlFor="p-email">Your email</label>
          <input id="p-email" type="email" required placeholder="Your email" className="field" />
          <label className="sr-only" htmlFor="p-link">Link</label>
          <input id="p-link" type="url" placeholder="Link to photos / video / repo" className="field" />
          <label className="sr-only" htmlFor="p-desc">Description</label>
          <textarea id="p-desc" rows={3} placeholder="What does it do? What parts did you use?" className="field" />
          <div>
            <Button type="submit">Submit your project →</Button>
          </div>
        </form>
      )}
    </div>
  )
}

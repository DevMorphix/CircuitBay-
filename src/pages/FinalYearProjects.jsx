import { Link } from 'react-router-dom'
import { PageShell } from '../components/layout/PageShell.jsx'
import { PageHero, Section } from '../components/ui/Section.jsx'
import { Reveal } from '../components/ui/Reveal.jsx'
import { Button } from '../components/ui/Button.jsx'
import { Icon } from '../components/ui/Icon.jsx'
import { FaqList } from '../components/content/FaqList.jsx'
import { finalYear } from '../content/landingData.js'
import { getProduct } from '../content/shopData.js'
import { publishedArticles } from '../content/blogData.js'
import { schema } from '../lib/seo.js'

// Pillar page for "final year IoT / electronics project" searches — links
// each idea to its kit, guide and community build.
export function FinalYearProjects() {
  const path = '/final-year-projects'
  const guide = (slug) => publishedArticles.find((a) => a.slug === slug)

  return (
    <PageShell
      seo={{
        ...finalYear.seo,
        path,
        jsonLd: [
          schema.itemList(finalYear.ideas.map((i) => ({ name: i.title, path: `${path}#${slugify(i.title)}` }))),
          schema.faq(finalYear.faq),
          schema.breadcrumbs([{ name: 'Home', path: '/' }, { name: 'Final-year projects', path }]),
        ],
      }}
    >
      <PageHero eyebrow={finalYear.eyebrow} title={finalYear.headline} subtitle={finalYear.subhead}>
        <div className="mt-8 flex flex-wrap gap-4">
          <Button href="#ideas">Browse project ideas →</Button>
          <Button to="/contact" variant="secondary-dark">
            Talk to a mentor
          </Button>
        </div>
      </PageHero>

      <Section tone="soft" id="ideas" eyebrow="PROJECT IDEAS" title="8 final-year projects you can actually build">
        <div className="grid gap-6 md:grid-cols-2">
          {finalYear.ideas.map((idea, i) => {
            const kit = idea.kit && getProduct(idea.kit)
            const product = idea.product && getProduct(idea.product)
            const article = idea.guide && guide(idea.guide)
            return (
              <Reveal key={idea.title} delay={(i % 2) * 0.06}>
                <article id={slugify(idea.title)} className="card flex h-full scroll-mt-28 flex-col p-7">
                  <div className="flex flex-wrap gap-2">
                    <span className="chip">{idea.level}</span>
                    <span className="chip">{idea.domain}</span>
                  </div>
                  <h3 className="mt-4 font-heading text-xl font-semibold text-ink-900">{idea.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-ink-600">{idea.demo}</p>
                  <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-ink-400">Main components</p>
                  <ul className="mt-2 flex flex-wrap gap-1.5">
                    {idea.parts.map((p) => (
                      <li key={p} className="rounded-md border border-black/10 px-2 py-0.5 text-xs font-medium text-ink-600">
                        {p}
                      </li>
                    ))}
                  </ul>
                  <div className="mt-auto flex flex-wrap gap-x-5 gap-y-2 pt-6 text-sm font-semibold">
                    {kit && (
                      <Link to={`/shop/product/${kit.id}`} className="text-brand-600 hover:text-brand-700">
                        Get the {kit.name} →
                      </Link>
                    )}
                    {product && (
                      <Link to={`/shop/product/${product.id}`} className="text-brand-600 hover:text-brand-700">
                        Shop the {product.name} →
                      </Link>
                    )}
                    {article && (
                      <Link to={`/blog/${article.slug}`} className="text-brand-600 hover:text-brand-700">
                        Read the guide →
                      </Link>
                    )}
                    {idea.project && (
                      <Link to="/projects" className="text-ink-600 hover:text-brand-600">
                        See a community build →
                      </Link>
                    )}
                  </div>
                </article>
              </Reveal>
            )
          })}
        </div>
      </Section>

      <Section tone="light" eyebrow="BEFORE YOU START" title="How to pick a final-year project that scores well">
        <div className="grid gap-8 md:grid-cols-2">
          {finalYear.tips.map((t) => (
            <div key={t.h} className="flex gap-4">
              <Icon name="check" className="mt-1 shrink-0 text-brand-500" />
              <div>
                <h3 className="font-heading text-lg font-semibold text-ink-900">{t.h}</h3>
                <p className="mt-1 leading-relaxed text-ink-600">{t.p}</p>
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section tone="dark">
        <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
          <div>
            <h2 className="font-heading text-3xl font-semibold text-white">Need a part that isn't listed?</h2>
            <p className="mt-2 text-white/70">Tell us the part number — we'll source it for your project.</p>
          </div>
          <Button to="/request-a-part">Request a part →</Button>
        </div>
      </Section>

      <Section tone="grey" eyebrow="QUESTIONS" title="Final-year project FAQ" width="max-w-3xl">
        <FaqList items={finalYear.faq} />
      </Section>
    </PageShell>
  )
}

const slugify = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

import { useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { PageShell } from '../components/layout/PageShell.jsx'
import { PageHero, Section } from '../components/ui/Section.jsx'
import { Reveal } from '../components/ui/Reveal.jsx'
import { Icon } from '../components/ui/Icon.jsx'
import { NewsletterForm } from '../components/ui/NewsletterForm.jsx'
import { ArticleCard } from '../components/content/ArticleCard.jsx'
import { publishedArticles as articles, blogCategories, blogHome } from '../content/blogData.js'
import { schema } from '../lib/seo.js'

const PER_PAGE = 6

// B1 — header + search, featured article, category chips, 3-col grid,
// newsletter block, pagination.
export function BlogHome() {
  const [params, setParams] = useSearchParams()
  const category = params.get('category') ?? ''
  const q = params.get('q') ?? ''
  const page = Math.max(1, Number(params.get('page')) || 1)

  const update = (patch) => {
    const next = new URLSearchParams(params)
    Object.entries(patch).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)))
    if (!('page' in patch)) next.delete('page')
    setParams(next, { replace: true })
  }

  const filtering = Boolean(category || q)
  const featured = articles.find((a) => a.featured)

  const list = useMemo(() => {
    const needle = q.toLowerCase()
    return articles.filter(
      (a) =>
        (filtering || a !== featured) &&
        (!category || a.category === category) &&
        (!needle || `${a.title} ${a.excerpt}`.toLowerCase().includes(needle)),
    )
  }, [category, q, filtering, featured])

  const pages = Math.max(1, Math.ceil(list.length / PER_PAGE))
  const visible = list.slice((page - 1) * PER_PAGE, page * PER_PAGE)

  return (
    <PageShell
      seo={{
        title: 'Electronics, IoT & Arduino Tutorials — Blog',
        description: 'Beginner-friendly ESP32, Arduino and IoT tutorials, sensor buying guides and datasheets explained — learn by reading, then build.',
        path: '/blog',
        // Filtered / searched views are variations of /blog, not new pages
        noindex: Boolean(q || category || page > 1),
        jsonLd: [
          schema.breadcrumbs([{ name: 'Home', path: '/' }, { name: 'Blog', path: '/blog' }]),
          schema.itemList(articles.map((a) => ({ name: a.title, path: `/blog/${a.slug}` }))),
        ],
      }}
    >
      <PageHero eyebrow={blogHome.eyebrow} title={blogHome.headline} subtitle={blogHome.subhead}>
        <form role="search" onSubmit={(e) => e.preventDefault()} className="relative mt-8 max-w-xl">
          <label htmlFor="blog-search" className="sr-only">
            Search articles
          </label>
          <Icon name="search" size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-white/50" />
          <input
            id="blog-search"
            type="search"
            value={q}
            onChange={(e) => update({ q: e.target.value })}
            placeholder="Search tutorials, sensors, projects…"
            className="field py-3! pl-11!"
          />
        </form>
      </PageHero>

      <Section tone="grey">
        {!filtering && featured && (
          <Reveal className="mb-12">
            <h2 className="sr-only">Featured article</h2>
            <ArticleCard article={featured} featured />
          </Reveal>
        )}

        <div className="mb-10 flex flex-wrap gap-2" role="group" aria-label="Filter by category">
          <Chip active={!category} onClick={() => update({ category: '' })}>
            All
          </Chip>
          {blogCategories.map((c) => (
            <Chip key={c.slug} active={category === c.slug} onClick={() => update({ category: c.slug })}>
              {c.label}
            </Chip>
          ))}
        </div>

        <h2 className="sr-only">{category ? `${blogCategories.find((c) => c.slug === category)?.label ?? 'Filtered'} articles` : 'Latest articles'}</h2>
        {visible.length ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {visible.map((a, i) => (
              <Reveal key={a.slug} delay={(i % 3) * 0.06}>
                <ArticleCard article={a} />
              </Reveal>
            ))}
          </div>
        ) : (
          <p className="card p-10 text-center text-ink-600">No articles match that yet. Try another search.</p>
        )}

        {pages > 1 && (
          <nav aria-label="Pagination" className="mt-12 flex justify-center gap-2">
            {Array.from({ length: pages }, (_, i) => i + 1).map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => update({ page: String(n) })}
                aria-current={n === page ? 'page' : undefined}
                className={`h-10 w-10 rounded-xl text-sm font-semibold ${
                  n === page ? 'bg-brand-600 text-white' : 'bg-white text-ink-600 shadow-sm hover:text-brand-600'
                }`}
              >
                {n}
              </button>
            ))}
          </nav>
        )}
      </Section>

      <Section tone="dark">
        <div className="flex flex-col items-start justify-between gap-8 md:flex-row md:items-center">
          <div>
            <p className="eyebrow mb-3">NEWSLETTER</p>
            <h2 className="font-heading text-3xl font-semibold text-white">{blogHome.newsletter.copy}</h2>
          </div>
          <NewsletterForm className="w-full max-w-md" source="blog" cta={blogHome.newsletter.cta} />
        </div>
      </Section>
    </PageShell>
  )
}

function Chip({ active, children, ...rest }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
        active ? 'bg-brand-600 text-white' : 'bg-white text-ink-600 shadow-sm hover:text-brand-600'
      }`}
      {...rest}
    >
      {children}
    </button>
  )
}

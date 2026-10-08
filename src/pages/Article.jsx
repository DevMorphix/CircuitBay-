import { Link, useParams } from 'react-router-dom'
import { PageShell } from '../components/layout/PageShell.jsx'
import { Section } from '../components/ui/Section.jsx'
import { Button } from '../components/ui/Button.jsx'
import { Photo } from '../components/ui/Card.jsx'
import { Icon } from '../components/ui/Icon.jsx'
import { ArticleCard } from '../components/content/ArticleCard.jsx'
import { ArticleBody } from '../components/content/ArticleBody.jsx'
import { ProjectCard } from '../components/content/ProjectCard.jsx'
import { publishedArticles as articles, categoryLabel, formatDate } from '../content/blogData.js'
import { schema } from '../lib/seo.js'
import { stripInline } from '../lib/markdown.js'
import { projects } from '../content/siteContent.js'
import { formatPrice, getProduct } from '../content/shopData.js'
import { NotFound } from './NotFound.jsx'

// B2 — single centred column (~720px), sticky TOC on desktop, "Parts used"
// cross-sell, related projects/articles, "Built this?" CTA.
export function Article() {
  const { slug } = useParams()
  const article = articles.find((a) => a.slug === slug)
  // Unknown and draft articles are 404s
  if (!article) return <NotFound />
  const path = `/blog/${article.slug}`

  const toc = article.body.filter((b) => b.type === 'h2')
  const parts = article.parts.map(getProduct).filter(Boolean)
  const related = articles.filter((a) => a.slug !== slug && a.category === article.category).concat(
    articles.filter((a) => a.slug !== slug && a.category !== article.category),
  ).slice(0, 3)
  const relatedProjects = projects.filter((p) => article.relatedProjects.includes(p.id))

  return (
    <PageShell
      seo={{
        title: article.seoTitle ?? article.title,
        description: article.excerpt,
        path,
        type: 'article',
        image: article.cover,
        jsonLd: [
          schema.article(article, path),
          schema.breadcrumbs([{ name: 'Home', path: '/' }, { name: 'Blog', path: '/blog' }, { name: article.title, path }]),
        ],
      }}
    >
      <header className="section-dark px-4 pb-14 pt-32 sm:px-6 md:pt-36">
        <div className="mx-auto max-w-[720px]">
          <nav aria-label="Breadcrumb" className="text-sm text-white/55">
            <Link to="/" className="hover:text-white">Home</Link> /{' '}
            <Link to="/blog" className="font-semibold text-brand-300 hover:text-white">Blog</Link> /{' '}
            <Link to={`/blog?category=${article.category}`} className="hover:text-white">{categoryLabel(article.category)}</Link>
          </nav>
          <p className="mt-6">
            <span className="chip">{categoryLabel(article.category)}</span>
          </p>
          <h1 className="mt-4 font-heading text-3xl font-semibold tracking-tight text-white sm:text-5xl">{article.title}</h1>
          <p className="mt-5 text-sm text-white/60">
            {article.author} · <time dateTime={article.date}>{formatDate(article.date)}</time>
            {article.updated && article.updated !== article.date && (
              <>
                {' '}· Updated <time dateTime={article.updated}>{formatDate(article.updated)}</time>
              </>
            )}{' '}
            · {article.readTime} min read
          </p>
        </div>
      </header>

      <div className="section-light px-4 pb-20 sm:px-6">
        <div className="mx-auto max-w-6xl">
          <Photo src={article.cover} eager label={`${article.title} — cover image`} className="mx-auto block aspect-[16/8] w-full max-w-[960px] rounded-b-2xl" />

          <div className="mx-auto mt-12 grid max-w-[1040px] gap-12 lg:grid-cols-[1fr_240px]">
            <article className="mx-auto w-full min-w-0 max-w-[720px]">
              <ArticleBody blocks={article.body} />

              {parts.length > 0 && (
                <aside className="card mt-12 p-6" aria-labelledby="parts-used">
                  <h2 id="parts-used" className="font-heading text-lg font-semibold text-ink-900">
                    Parts used
                  </h2>
                  <ul className="mt-4 divide-y divide-black/5">
                    {parts.map((p) => (
                      <li key={p.id}>
                        <Link to={`/shop/product/${p.id}`} className="group flex items-center justify-between gap-4 py-3">
                          <span className="flex items-center gap-3">
                            <Icon name="box" size={20} className="text-brand-500" />
                            <span className="text-sm font-medium text-ink-900 group-hover:text-brand-600">{p.name}</span>
                          </span>
                          <span className="text-sm font-semibold text-ink-600">{formatPrice(p.price)} →</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </aside>
              )}

              <p className="mt-10 text-sm text-ink-600">
                Questions or improvements?{' '}
                {/* TODO_CLIENT: link to the matching community discussion thread */}
                <a href="https://community.circuitbay.in" className="font-semibold text-brand-600 hover:text-brand-700">
                  Join the discussion →
                </a>
              </p>
            </article>

            <nav aria-label="On this page" className="hidden lg:block">
              <div className="sticky top-28">
                <p className="eyebrow mb-3">ON THIS PAGE</p>
                <ul className="space-y-2 border-l border-black/10">
                  {toc.map((h) => (
                    <li key={h.id}>
                      <a href={`#${h.id}`} className="-ml-px block border-l-2 border-transparent pl-4 text-sm text-ink-600 hover:border-brand-500 hover:text-brand-600">
                        {stripInline(h.text)}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            </nav>
          </div>
        </div>
      </div>

      <Section tone="dark">
        <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
          <h2 className="font-heading text-3xl font-semibold text-white">Built this? Share it with the bay.</h2>
          <Button to="/projects#submit">Submit your project →</Button>
        </div>
      </Section>

      {relatedProjects.length > 0 && (
        <Section tone="soft" eyebrow="FROM THE COMMUNITY" title="Related projects">
          <div className="grid gap-6 md:grid-cols-3">
            {relatedProjects.map((p) => (
              <ProjectCard key={p.id} project={p} />
            ))}
          </div>
        </Section>
      )}

      <Section tone="grey" eyebrow="KEEP READING" title="Related articles">
        <div className="grid gap-6 md:grid-cols-3">
          {related.map((a) => (
            <ArticleCard key={a.slug} article={a} />
          ))}
        </div>
      </Section>
    </PageShell>
  )
}

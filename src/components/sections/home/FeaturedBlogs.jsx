import { featuredBlogs } from '../../../content/siteContent.js'
import { publishedArticles as articles } from '../../../content/blogData.js'
import { Section } from '../../ui/Section.jsx'
import { Reveal } from '../../ui/Reveal.jsx'
import { ArrowLink } from '../../ui/Card.jsx'
import { ArticleCard } from '../../content/ArticleCard.jsx'

// A6 — light-grey: 3 article cards + "All articles".
export function FeaturedBlogs() {
  return (
    <Section
      tone="grey"
      id="learn"
      snap
      eyebrow={featuredBlogs.eyebrow}
      title={featuredBlogs.headline}
      headerAside={<ArrowLink to={featuredBlogs.cta.to}>{featuredBlogs.cta.label}</ArrowLink>}
    >
      <div className="grid gap-6 md:grid-cols-3">
        {articles.slice(0, 3).map((a, i) => (
          <Reveal key={a.slug} delay={i * 0.08}>
            <ArticleCard article={a} />
          </Reveal>
        ))}
      </div>
    </Section>
  )
}

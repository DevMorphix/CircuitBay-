import { Card, Photo } from '../ui/Card.jsx'
import { categoryLabel, formatDate } from '../../content/blogData.js'

// Blog article card: cover, category tag, title, excerpt, read time, date.
export function ArticleCard({ article, featured = false }) {
  return (
    <Card
      to={`/blog/${article.slug}`}
      className={`flex h-full overflow-hidden ${featured ? 'flex-col md:flex-row' : 'flex-col'}`}
    >
      <Photo
        label="Cover image"
        className={featured ? 'aspect-[16/10] md:aspect-auto md:w-1/2' : 'aspect-[16/9]'}
      />
      <div className={`flex flex-1 flex-col ${featured ? 'p-8 md:p-10' : 'p-6'}`}>
        <span className="chip self-start">{categoryLabel(article.category)}</span>
        <h3
          className={`mt-3 font-heading font-semibold text-ink-900 transition-colors group-hover:text-brand-600 ${
            featured ? 'text-2xl sm:text-3xl' : 'text-lg'
          }`}
        >
          {article.title}
        </h3>
        <p className={`mt-2 flex-1 leading-relaxed text-ink-600 ${featured ? 'text-base' : 'line-clamp-2 text-sm'}`}>
          {article.excerpt}
        </p>
        <p className="mt-4 text-xs text-ink-400">
          {article.readTime} min read · {formatDate(article.date)}
        </p>
      </div>
    </Card>
  )
}

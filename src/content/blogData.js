// Blog content (Part B). DRAFT copy pending client sign-off.
// TODO_CLIENT: real authors and cover images; replace the two `draft`
// articles with the real project/workshop stories before publishing them.
//
// Body blocks: { type: 'h2', id, text } | { type: 'p', text }
//   | { type: 'list', items: [] } | { type: 'table', head: [], rows: [[]] }
//   | { type: 'code', text } | { type: 'diagram', text }

import articlesData from './data/articles.js'

export const blogHome = {
  eyebrow: 'THE BAY BLOG',
  headline: 'Learn by reading. Then build.',
  subhead: 'Electronics, IoT and Arduino tutorials, project write-ups and datasheets explained — written by people who build.',
  newsletter: { copy: 'New builds and tutorials, once a week. No spam.', cta: 'Subscribe' },
}

export const blogCategories = [
  { slug: 'tutorials', label: 'Tutorials' },
  { slug: 'project-write-ups', label: 'Project Write-ups' },
  { slug: 'datasheets-explained', label: 'Datasheets Explained' },
  { slug: 'workshop-recaps', label: 'Workshop Recaps' },
  { slug: 'product-guides', label: 'Product Guides' },
]

// Articles live in data/articles.js (pulled from the API at build time)
export const articles = articlesData

// Only published articles appear in listings, the sitemap and search
export const publishedArticles = articles.filter((a) => !a.draft).sort((a, b) => b.date.localeCompare(a.date))

export const categoryLabel = (slug) => blogCategories.find((c) => c.slug === slug)?.label ?? slug

export const formatDate = (iso) =>
  new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' })

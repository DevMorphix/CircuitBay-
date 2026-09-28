import { prerender } from 'react-dom/static'
import { StaticRouter } from 'react-router-dom'
import App from './App.jsx'
import { HeadCollector, createHeadCollector } from './lib/headCollector.js'
import { headToHtml } from './lib/seo.js'
import { products, shopCategories } from './content/shopData.js'
import { publishedArticles } from './content/blogData.js'

export { SITE } from './lib/seo.js'

// Build-time renderer used by scripts/prerender.js. Renders one URL to
// static HTML (waiting for lazy pages to load) and returns the page's head
// tags as collected by <Seo>.
export async function render(url) {
  const collector = createHeadCollector()
  const { prelude } = await prerender(
    <HeadCollector.Provider value={collector}>
      <StaticRouter location={url}>
        <App />
      </StaticRouter>
    </HeadCollector.Provider>,
  )
  const html = await new Response(prelude).text()
  const head = collector.get()
  return { html, head: head ? headToHtml(head) : '', noindex: Boolean(head?.meta.some((m) => m.name === 'robots' && m.content.startsWith('noindex'))) }
}

const BUILD_DATE = new Date().toISOString().slice(0, 10)

// Every public, indexable page → prerendered + listed in the sitemap.
// TODO: once the frontend reads the catalog from the API, build these
// lists from the API so new products/articles are prerendered too.
export const indexableRoutes = [
  { path: '/', priority: 1.0, changefreq: 'weekly' },
  { path: '/shop', priority: 0.9, changefreq: 'daily' },
  ...shopCategories.map((c) => ({ path: `/shop/category/${c.slug}`, priority: 0.8, changefreq: 'daily' })),
  ...products.map((p) => ({ path: `/shop/product/${p.id}`, priority: p.kit ? 0.8 : 0.7, changefreq: 'weekly' })),
  { path: '/schools', priority: 0.9, changefreq: 'monthly' },
  { path: '/final-year-projects', priority: 0.9, changefreq: 'monthly' },
  { path: '/request-a-part', priority: 0.6, changefreq: 'monthly' },
  { path: '/blog', priority: 0.8, changefreq: 'weekly' },
  ...publishedArticles.map((a) => ({ path: `/blog/${a.slug}`, priority: 0.7, changefreq: 'monthly', lastmod: a.updated ?? a.date })),
  { path: '/projects', priority: 0.7, changefreq: 'weekly' },
  { path: '/about', priority: 0.6, changefreq: 'monthly' },
  { path: '/contact', priority: 0.6, changefreq: 'yearly' },
  { path: '/faq', priority: 0.5, changefreq: 'monthly' },
  { path: '/shop/category/all', priority: 0.5, changefreq: 'daily' },
  { path: '/privacy-policy', priority: 0.2, changefreq: 'yearly' },
  { path: '/terms', priority: 0.2, changefreq: 'yearly' },
  { path: '/refund-policy', priority: 0.3, changefreq: 'yearly' },
  { path: '/shipping-policy', priority: 0.3, changefreq: 'yearly' },
].map((r) => ({ lastmod: BUILD_DATE, ...r }))

// Private / per-visitor pages: served as an empty app shell (noindex),
// rendered in the browser.
export const shellRoutes = ['/shop/cart', '/shop/checkout', '/shop/track', '/shop/order/*', '/account', '/login', '/register', '/forgot-password', '/reset-password', '/admin', '/admin/*']

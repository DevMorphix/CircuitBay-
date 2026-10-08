// SEO building blocks shared by the <Seo> component (browser) and the
// build-time prerenderer (scripts/prerender.js).

export const SITE = {
  url: 'https://circuitbay.in', // canonical host — redirect www → apex at the CDN
  name: 'CircuitBay',
  alternateName: ['Circuit Bay', 'circuitbay.in'],
  locale: 'en_IN',
  defaultImage: '/og-image.jpg',
  defaultDescription:
    'Electronics components, IoT & robotics project kits, and hands-on workshops for students, makers and schools across India. Create. Break. Learn.',
  logo: '/icon-512.png', // TODO_CLIENT: point at the final logo file once supplied
  // TODO_CLIENT: real profile URLs — they tie the brand together in search
  sameAs: [],
}

export const absoluteUrl = (path = '/') => (/^https?:\/\//.test(path) ? path : `${SITE.url}${path.startsWith('/') ? path : `/${path}`}`)

// Trim to `max` characters at a word boundary (search snippets cut at ~160)
const clampWords = (text, max) => (text.length <= max ? text : `${text.slice(0, max - 1).replace(/\s+\S*$/, '')}…`)

const withBrand = (title) => (title.includes(SITE.name) ? title : `${title} | ${SITE.name}`)

// Normalised head description for one page
export function buildHead({ title, description, path = '/', image, type = 'website', noindex = false, jsonLd = [], preloadImage }) {
  const fullTitle = title ? withBrand(title) : `${SITE.name}: Electronics, IoT & Robotics Kits in India`
  const desc = clampWords(description ?? SITE.defaultDescription, 160)
  const canonical = absoluteUrl(path)
  const img = absoluteUrl(image ?? SITE.defaultImage)
  return {
    title: fullTitle,
    meta: [
      { name: 'description', content: desc },
      { name: 'robots', content: noindex ? 'noindex, follow' : 'index, follow, max-image-preview:large' },
      { property: 'og:type', content: type },
      { property: 'og:site_name', content: SITE.name },
      { property: 'og:locale', content: SITE.locale },
      { property: 'og:title', content: fullTitle },
      { property: 'og:description', content: desc },
      { property: 'og:url', content: canonical },
      { property: 'og:image', content: img },
      // Dimensions are only known for the default share image
      ...(image ? [] : [{ property: 'og:image:width', content: '1200' }, { property: 'og:image:height', content: '630' }]),
      { name: 'twitter:card', content: 'summary_large_image' },
      { name: 'twitter:title', content: fullTitle },
      { name: 'twitter:description', content: desc },
      { name: 'twitter:image', content: img },
    ],
    links: [
      ...(noindex ? [] : [{ rel: 'canonical', href: canonical }]),
      ...(preloadImage ? [{ rel: 'preload', as: 'image', href: preloadImage, type: 'image/webp', fetchpriority: 'high' }] : []),
    ],
    jsonLd: jsonLd.filter(Boolean),
  }
}

// ---- HTML serialisation (prerender) ----
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const attrs = (o) => Object.entries(o).map(([k, v]) => `${k}="${esc(v)}"`).join(' ')
// JSON inside <script> must not be able to close the tag
const safeJson = (o) => JSON.stringify(o).replace(/</g, '\\u003c')

export function headToHtml(head) {
  return [
    `<title data-seo>${esc(head.title)}</title>`,
    ...head.meta.map((m) => `<meta data-seo ${attrs(m)} />`),
    ...head.links.map((l) => `<link data-seo ${attrs(l)} />`),
    ...head.jsonLd.map((j) => `<script data-seo type="application/ld+json">${safeJson(j)}</script>`),
  ].join('\n    ')
}

// ---- Structured data (schema.org JSON-LD) ----
export const schema = {
  organization: () => ({
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${SITE.url}/#organization`,
    name: SITE.name,
    alternateName: SITE.alternateName,
    url: SITE.url,
    logo: absoluteUrl(SITE.logo),
    description: SITE.defaultDescription,
    areaServed: 'IN',
    ...(SITE.sameAs.length ? { sameAs: SITE.sameAs } : {}),
  }),

  // Google uses WebSite.name for the site name shown in results — important
  // because other businesses also use the "CircuitBay" name.
  website: () => ({
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${SITE.url}/#website`,
    name: SITE.name,
    alternateName: SITE.alternateName,
    url: SITE.url,
    inLanguage: 'en-IN',
    publisher: { '@id': `${SITE.url}/#organization` },
  }),

  breadcrumbs: (items) => ({
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({ '@type': 'ListItem', position: i + 1, name: it.name, item: absoluteUrl(it.path) })),
  }),

  // The rating comes only from approved reviews by verified buyers, and is
  // left out until at least one exists (Google's review-snippet rules).
  product: (p) => ({
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: p.name,
    sku: p.id,
    description: p.forWhat,
    // Real photos once uploaded in /admin; the share image until then
    image: (p.images?.length ? p.images : [SITE.defaultImage]).map(absoluteUrl),
    brand: { '@type': 'Brand', name: p.brand ?? SITE.name },
    category: p.category,
    offers: {
      '@type': 'Offer',
      url: absoluteUrl(`/shop/product/${p.id}`),
      priceCurrency: 'INR',
      price: p.price.toFixed(2),
      // Catalogue prices exclude GST (added at checkout) — say so explicitly
      priceSpecification: { '@type': 'UnitPriceSpecification', price: p.price.toFixed(2), priceCurrency: 'INR', valueAddedTaxIncluded: false },
      availability: `https://schema.org/${p.stock === 0 ? 'OutOfStock' : p.stock < 10 ? 'LimitedAvailability' : 'InStock'}`,
      itemCondition: 'https://schema.org/NewCondition',
      seller: { '@id': `${SITE.url}/#organization` },
    },
    ...(p.reviews > 0 && p.rating > 0
      ? { aggregateRating: { '@type': 'AggregateRating', ratingValue: p.rating, reviewCount: p.reviews, bestRating: 5, worstRating: 1 } }
      : {}),
  }),

  article: (a, path) => ({
    '@context': 'https://schema.org',
    '@type': a.category === 'tutorials' ? 'TechArticle' : 'Article',
    headline: a.title,
    description: a.excerpt,
    datePublished: a.date,
    dateModified: a.updated ?? a.date,
    author: { '@type': 'Organization', name: a.author ?? SITE.name, url: SITE.url }, // TODO_CLIENT: real author names
    publisher: { '@id': `${SITE.url}/#organization` },
    image: [absoluteUrl(a.cover ?? SITE.defaultImage)],
    mainEntityOfPage: absoluteUrl(path),
    inLanguage: 'en-IN',
  }),

  faq: (items) => ({
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((i) => ({ '@type': 'Question', name: i.q, acceptedAnswer: { '@type': 'Answer', text: i.a } })),
  }),

  service: ({ name, description, path, serviceType }) => ({
    '@context': 'https://schema.org',
    '@type': 'Service',
    name,
    description,
    serviceType,
    url: absoluteUrl(path),
    areaServed: { '@type': 'Country', name: 'India' },
    provider: { '@id': `${SITE.url}/#organization` },
  }),

  itemList: (items) => ({
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    itemListElement: items.map((it, i) => ({ '@type': 'ListItem', position: i + 1, url: absoluteUrl(it.path), name: it.name })),
  }),
}

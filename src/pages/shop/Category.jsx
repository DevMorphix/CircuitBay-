import { useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { PageShell } from '../../components/layout/PageShell.jsx'
import { PageHero, Section } from '../../components/ui/Section.jsx'
import { Button } from '../../components/ui/Button.jsx'
import { ArrowText, Card } from '../../components/ui/Card.jsx'
import { Icon } from '../../components/ui/Icon.jsx'
import { ProductCard } from '../../components/shop/ProductCard.jsx'
import { products, shopCategories, skillLevels } from '../../content/shopData.js'
import { publishedArticles as articles } from '../../content/blogData.js'
import { schema } from '../../lib/seo.js'

const PER_PAGE = 8
const PRICE_BANDS = [
  { id: 'u200', label: 'Under ₹200', test: (p) => p < 200 },
  { id: '200-1000', label: '₹200 – ₹1,000', test: (p) => p >= 200 && p <= 1000 },
  { id: 'o1000', label: 'Over ₹1,000', test: (p) => p > 1000 },
]
// No popularity/rating sorts until those numbers are real
const SORTS = {
  featured: { label: 'Featured', fn: (a, b) => Number(Boolean(b.kit)) - Number(Boolean(a.kit)) || a.name.localeCompare(b.name) },
  'price-asc': { label: 'Price: low to high', fn: (a, b) => a.price - b.price },
  'price-desc': { label: 'Price: high to low', fn: (a, b) => b.price - a.price },
}

// C3 — breadcrumb → header → filters (sidebar / mobile drawer) → sort →
// grid → pagination → related tutorials. `all` = every product (search).
export function Category() {
  const { slug } = useParams()
  const [params] = useSearchParams()
  // Remount on category/search change so filters + paging reset
  return <CategoryView key={`${slug}?${params.get('q') ?? ''}`} slug={slug} params={params} />
}

function CategoryView({ slug, params }) {
  const q = (params.get('q') ?? '').toLowerCase()
  const category = shopCategories.find((c) => c.slug === slug)
  const title = category ? `${category.label} kits & components` : q ? `Results for “${params.get('q')}”` : 'All parts & kits'
  const path = `/shop/category/${slug}`
  const seo = category
    ? {
        title: category.seoTitle,
        description: category.description,
        path,
        jsonLd: [schema.breadcrumbs([{ name: 'Home', path: '/' }, { name: 'Shop', path: '/shop' }, { name: category.label, path }])],
      }
    : {
        title: q ? `Search: ${params.get('q')}` : 'All Electronics Parts & Kits',
        description: 'Every electronic component, sensor, board and project kit in the CircuitBay shop, with filters for price, skill level and brand.',
        path: '/shop/category/all',
        // Internal search results shouldn't be indexed; unknown slugs are soft-404s
        noindex: Boolean(q) || slug !== 'all',
      }

  const base = products.filter(
    (p) => (!category || p.category === slug) && (!q || `${p.name} ${p.forWhat} ${p.type}`.toLowerCase().includes(q)),
  )
  const brands = [...new Set(base.map((p) => p.brand))]
  const types = [...new Set(base.map((p) => p.type))]

  const [filters, setFilters] = useState({ price: [], level: [], brand: [], type: [], inStock: false })
  const [sort, setSort] = useState('featured')
  const [page, setPage] = useState(1)
  const [drawer, setDrawer] = useState(false)

  const toggle = (key, value) => {
    setPage(1)
    setFilters((f) => ({ ...f, [key]: f[key].includes(value) ? f[key].filter((v) => v !== value) : [...f[key], value] }))
  }

  const list = base
        .filter((p) => !filters.price.length || PRICE_BANDS.some((b) => filters.price.includes(b.id) && b.test(p.price)))
        .filter((p) => !filters.level.length || filters.level.includes(p.level))
        .filter((p) => !filters.brand.length || filters.brand.includes(p.brand))
        .filter((p) => !filters.type.length || filters.type.includes(p.type))
        .filter((p) => !filters.inStock || p.stock > 0)
    .sort(SORTS[sort].fn)
  const pages = Math.max(1, Math.ceil(list.length / PER_PAGE))
  const visible = list.slice((page - 1) * PER_PAGE, page * PER_PAGE)
  const tutorials = articles.filter((a) => a.category === 'tutorials' || a.category === 'product-guides').slice(0, 3)

  const filterPanel = (
    <div className="space-y-7">
      <FilterGroup title="Price">
        {PRICE_BANDS.map((b) => (
          <Check key={b.id} label={b.label} checked={filters.price.includes(b.id)} onChange={() => toggle('price', b.id)} />
        ))}
      </FilterGroup>
      <FilterGroup title="Skill level">
        {skillLevels.map((l) => (
          <Check key={l} label={l} checked={filters.level.includes(l)} onChange={() => toggle('level', l)} />
        ))}
      </FilterGroup>
      <FilterGroup title="Brand">
        {brands.map((b) => (
          <Check key={b} label={b} checked={filters.brand.includes(b)} onChange={() => toggle('brand', b)} />
        ))}
      </FilterGroup>
      <FilterGroup title="Component type">
        {types.map((t) => (
          <Check key={t} label={t} checked={filters.type.includes(t)} onChange={() => toggle('type', t)} />
        ))}
      </FilterGroup>
      <FilterGroup title="Availability">
        <Check label="In stock only" checked={filters.inStock} onChange={() => setFilters((f) => ({ ...f, inStock: !f.inStock }))} />
      </FilterGroup>
    </div>
  )

  return (
    <PageShell shop seo={seo}>
      <PageHero
        compact
        title={title}
        subtitle={category?.description}
        eyebrow={
          <nav aria-label="Breadcrumb">
            <Link to="/shop" className="hover:text-white">
              Shop
            </Link>{' '}
            / <span aria-current="page">{category?.label ?? 'All'}</span>
          </nav>
        }
      />

      <Section tone="soft" className="pt-10!">
        <div className="grid gap-8 lg:grid-cols-[220px_1fr]">
          <aside className="hidden lg:block" aria-label="Filters">
            {filterPanel}
          </aside>

          <div>
            <div className="mb-6 flex items-center justify-between gap-4">
              <p className="text-sm text-ink-600">
                <span className="font-semibold text-ink-900">{list.length}</span> products
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setDrawer(true)}
                  className="flex items-center gap-2 rounded-xl border border-black/10 bg-white px-3 py-2 text-sm font-semibold text-ink-900 lg:hidden"
                >
                  <Icon name="filter" size={16} /> Filters
                </button>
                <label htmlFor="sort" className="sr-only">
                  Sort by
                </label>
                <select id="sort" value={sort} onChange={(e) => setSort(e.target.value)} className="field w-auto! py-2!">
                  {Object.entries(SORTS).map(([k, s]) => (
                    <option key={k} value={k}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Keeps heading order valid (h1 → h2 → product-card h3) */}
            <h2 className="sr-only">Products</h2>
            {visible.length ? (
              <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
                {visible.map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
            ) : (
              <div className="card p-12 text-center">
                <p className="font-heading text-xl font-semibold text-ink-900">Nothing here yet. Tell us what you're building.</p>
                <Button to="/contact" className="mt-6">
                  Request a part
                </Button>
              </div>
            )}

            {pages > 1 && (
              <nav aria-label="Pagination" className="mt-10 flex justify-center gap-2">
                {Array.from({ length: pages }, (_, i) => i + 1).map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setPage(n)}
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
          </div>
        </div>
      </Section>

      {category?.guide && (
        <Section tone="light" eyebrow="BUYING GUIDE" title={`How to choose ${category.label.toLowerCase()} parts`} width="max-w-4xl">
          <div className="space-y-8">
            {category.guide.map((g) => (
              <div key={g.h}>
                <h3 className="font-heading text-xl font-semibold text-ink-900">{g.h}</h3>
                <p className="mt-2 leading-relaxed text-ink-600">{g.p}</p>
              </div>
            ))}
          </div>
        </Section>
      )}

      <Section tone={category?.guide ? 'grey' : 'light'} eyebrow="LEARN" title="Related tutorials">
        <div className="grid gap-4 md:grid-cols-3">
          {tutorials.map((a) => (
            <Card key={a.slug} to={`/blog/${a.slug}`} className="p-6">
              <h3 className="font-heading text-lg font-semibold text-ink-900">{a.title}</h3>
              <p className="mt-2 text-sm text-ink-600">{a.excerpt}</p>
              <ArrowText className="mt-4">Read</ArrowText>
            </Card>
          ))}
        </div>
      </Section>

      {drawer && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Filters">
          <button type="button" aria-label="Close filters" className="absolute inset-0 bg-navy-950/60" onClick={() => setDrawer(false)} />
          <div className="absolute inset-y-0 right-0 w-[85%] max-w-sm overflow-y-auto bg-white p-6">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="font-heading text-lg font-semibold">Filters</h2>
              <button type="button" onClick={() => setDrawer(false)} aria-label="Close filters">
                <Icon name="close" />
              </button>
            </div>
            {filterPanel}
            <Button className="mt-8 w-full" onClick={() => setDrawer(false)}>
              Show {list.length} products
            </Button>
          </div>
        </div>
      )}
    </PageShell>
  )
}

function FilterGroup({ title, children }) {
  return (
    <fieldset>
      <legend className="mb-3 text-xs font-semibold uppercase tracking-wider text-ink-400">{title}</legend>
      <div className="space-y-2">{children}</div>
    </fieldset>
  )
}

function Check({ label, checked, onChange }) {
  return (
    <label className="flex cursor-pointer items-center gap-2.5 text-sm text-ink-600 hover:text-ink-900">
      <input type="checkbox" checked={checked} onChange={onChange} className="h-4 w-4 rounded accent-brand-500" />
      {label}
    </label>
  )
}

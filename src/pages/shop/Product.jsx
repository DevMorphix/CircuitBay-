import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { PageShell } from '../../components/layout/PageShell.jsx'
import { Section } from '../../components/ui/Section.jsx'
import { Photo } from '../../components/ui/Card.jsx'
import { Icon } from '../../components/ui/Icon.jsx'
import { ProductCard, Badges, Rating } from '../../components/shop/ProductCard.jsx'
import { ProjectCard } from '../../components/content/ProjectCard.jsx'
import { QtyStepper } from '../../components/shop/QtyStepper.jsx'
import { formatPrice, getProduct, products, shopCategories } from '../../content/shopData.js'
import { projects } from '../../content/siteContent.js'
import { useCart } from '../../context/CartContext.jsx'
import { trackEvent } from '../../lib/analytics.js'
import { NotFound } from '../NotFound.jsx'
import { schema } from '../../lib/seo.js'

const TABS = ['Description', 'Specs', 'Datasheet', 'Reviews', 'Q&A']

// C4 — gallery left; name, price, stock, skill, description, qty, Add to
// cart + Buy now right; tabs below; "What you can build", frequently
// bought together, related. Copy rule: what it's *for* first, specs second.
export function Product() {
  const { id } = useParams()
  const product = getProduct(id)
  if (!product) return <NotFound />
  return <ProductView key={id} product={product} />
}

function ProductView({ product }) {
  const [qty, setQty] = useState(1)
  const [tab, setTab] = useState(TABS[0])
  const [image, setImage] = useState(0)
  const [added, setAdded] = useState(false)
  const { add } = useCart()
  const navigate = useNavigate()
  const category = shopCategories.find((c) => c.slug === product.category)

  const related = products.filter((p) => p.id !== product.id && p.category === product.category).slice(0, 4)
  const together = products.filter((p) => ['breadboard-830', 'jumper-wires', 'multimeter'].includes(p.id) && p.id !== product.id).slice(0, 2)
  const builds = projects.filter((p) => p.category.toLowerCase() === product.category || p.tags.some((t) => product.name.includes(t))).slice(0, 3)

  const addToCart = () => {
    add(product.id, qty)
    trackEvent('add_to_cart', { item_id: product.id, quantity: qty })
    setAdded(true)
  }

  return (
    <PageShell
      shop
      seo={{
        title: productTitle(product.name),
        description: `${product.forWhat} ${formatPrice(product.price)} with tracked delivery across India and student-friendly support.`.slice(0, 160),
        path: `/shop/product/${product.id}`,
        type: 'product',
        jsonLd: [
          schema.product(product),
          schema.breadcrumbs([
            { name: 'Home', path: '/' },
            { name: 'Shop', path: '/shop' },
            ...(category ? [{ name: category.label, path: `/shop/category/${category.slug}` }] : []),
            { name: product.name, path: `/shop/product/${product.id}` },
          ]),
        ],
      }}
    >
      <section className="section-light px-4 py-10 sm:px-6 md:py-14">
        <div className="mx-auto max-w-6xl">
          <nav aria-label="Breadcrumb" className="mb-6 text-sm text-ink-400">
            <Link to="/" className="hover:text-brand-600">Home</Link> /{' '}
            <Link to="/shop" className="hover:text-brand-600">Shop</Link> /{' '}
            <Link to={`/shop/category/${product.category}`} className="hover:text-brand-600">{category?.label}</Link> /{' '}
            <span className="text-ink-900">{product.name}</span>
          </nav>

          <div className="grid gap-10 lg:grid-cols-2 lg:gap-14">
            <div>
              <Photo label={`${product.name} — view ${image + 1}`} className="aspect-square rounded-2xl" />
              <div className="mt-3 grid grid-cols-4 gap-3">
                {[0, 1, 2, 3].map((i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setImage(i)}
                    aria-label={`Show image ${i + 1}`}
                    aria-pressed={image === i}
                    className={`overflow-hidden rounded-xl border-2 ${image === i ? 'border-brand-500' : 'border-transparent'}`}
                  >
                    <Photo label={String(i + 1)} className="aspect-square" />
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Badges badges={product.badges} />
              <h1 className="mt-3 font-heading text-3xl font-semibold tracking-tight text-ink-900 sm:text-4xl">{product.name}</h1>
              <div className="mt-3 flex items-center gap-4">
                <Rating value={product.rating} count={product.reviews} />
                <span className="chip">{product.level}</span>
              </div>
              <p className="mt-6 font-heading text-3xl font-semibold text-ink-900">{formatPrice(product.price)}</p>
              <p className="mt-1 text-xs text-ink-400">Inclusive of all taxes</p>
              <p className={`mt-3 text-sm font-semibold ${product.stock < 10 ? 'text-navy-800' : 'text-brand-600'}`}>
                {product.stock === 0 ? 'Out of stock' : product.stock < 10 ? `Only ${product.stock} left` : 'In stock — ships in 24 hours'}
              </p>
              <p className="mt-6 text-lg leading-relaxed text-ink-600">{product.forWhat}</p>
              {product.build && (
                <p className="mt-3 text-sm text-ink-600">
                  <span className="font-semibold text-ink-900">You'll build: </span>
                  {product.build}
                </p>
              )}

              <div className="mt-8 flex flex-wrap items-center gap-3">
                <QtyStepper value={qty} onChange={setQty} max={product.stock} />
                <button
                  type="button"
                  onClick={addToCart}
                  className="flex-1 rounded-xl border border-brand-500 px-6 py-3 text-sm font-semibold text-brand-600 transition-colors hover:bg-brand-500/5"
                >
                  Add to cart
                </button>
                <button
                  type="button"
                  onClick={() => {
                    add(product.id, qty)
                    navigate('/shop/checkout')
                  }}
                  className="flex-1 rounded-xl bg-brand-600 px-6 py-3 text-sm font-semibold text-white transition-all hover:bg-brand-700 hover:shadow-[0_0_24px_rgba(63,125,222,0.45)]"
                >
                  Buy now
                </button>
              </div>
              {added && (
                <p role="status" className="mt-3 flex items-center gap-2 text-sm text-brand-600">
                  <Icon name="check" size={16} /> Added to cart. <Link to="/shop/cart" className="font-semibold underline">View cart</Link>
                </p>
              )}

              <ul className="mt-8 grid grid-cols-2 gap-3 text-sm text-ink-600">
                <li className="flex items-center gap-2"><Icon name="truck" size={18} className="text-brand-500" /> Tracked delivery</li>
                <li className="flex items-center gap-2"><Icon name="return" size={18} className="text-brand-500" /> Easy returns</li>
                <li className="flex items-center gap-2"><Icon name="shield" size={18} className="text-brand-500" /> Secure payments</li>
                <li className="flex items-center gap-2"><Icon name="chat" size={18} className="text-brand-500" /> Build support</li>
              </ul>
            </div>
          </div>

          <div className="mt-16">
            <div role="tablist" aria-label="Product details" className="flex gap-1 overflow-x-auto border-b border-black/10">
              {TABS.map((t) => (
                <button
                  key={t}
                  role="tab"
                  type="button"
                  aria-selected={tab === t}
                  onClick={() => setTab(t)}
                  className={`-mb-px whitespace-nowrap border-b-2 px-4 py-3 text-sm font-semibold ${
                    tab === t ? 'border-brand-500 text-brand-600' : 'border-transparent text-ink-400 hover:text-ink-900'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
            <div role="tabpanel" className="max-w-3xl py-8 text-ink-600">
              <TabBody tab={tab} product={product} />
            </div>
          </div>
        </div>
      </section>

      {builds.length > 0 && (
        <Section tone="dark" eyebrow="FROM THE COMMUNITY" title="What you can build with this">
          <div className="grid gap-6 md:grid-cols-3">
            {builds.map((p) => (
              <ProjectCard key={p.id} project={p} />
            ))}
          </div>
        </Section>
      )}

      <Section tone="soft" title="Frequently bought together">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {[product, ...together].map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </Section>

      {related.length > 0 && (
        <Section tone="light" title="Related products">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {related.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </Section>
      )}
    </PageShell>
  )
}

function TabBody({ tab, product }) {
  switch (tab) {
    case 'Specs':
      return (
        <dl className="divide-y divide-black/5 rounded-xl border border-black/5">
          {Object.entries(product.specs).map(([k, v]) => (
            <div key={k} className="grid grid-cols-2 px-4 py-3 text-sm">
              <dt className="font-medium text-ink-900">{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
        </dl>
      )
    case 'Datasheet':
      // TODO_CLIENT: link real datasheet PDFs
      return (
        <p>
          Datasheet PDF coming soon. New to datasheets?{' '}
          <Link to="/blog/datasheets-explained-what-to-read" className="font-semibold text-brand-600">Here's what to actually read →</Link>
        </p>
      )
    case 'Reviews':
      return (
        <div>
          <Rating value={product.rating} count={product.reviews} />
          <p className="mt-3">Reviews from verified buyers will appear here.</p>
        </div>
      )
    case 'Q&A':
      return (
        <p>
          Have a question about this part?{' '}
          <Link to="/contact" className="font-semibold text-brand-600">Ask us →</Link>
        </p>
      )
    default:
      return (
        <div className="space-y-4">
          <p className="text-lg text-ink-900">{product.forWhat}</p>
          {product.inside && (
            <>
              <p className="font-semibold text-ink-900">What's inside</p>
              <ul className="space-y-2">
                {product.inside.map((i) => (
                  <li key={i} className="flex items-center gap-2">
                    <Icon name="check" size={16} className="text-brand-500" /> {i}
                  </li>
                ))}
              </ul>
              {/* TODO_CLIENT: build-guide link + "watch it built" video */}
              <p className="text-sm">
                <Link to="/blog" className="font-semibold text-brand-600">Step-by-step build guide →</Link>
              </p>
            </>
          )}
        </div>
      )
  }
}

// "<name> — Buy Online in India | CircuitBay", shortened for long names so
// the full title stays within ~65 characters
function productTitle(name) {
  const brand = ' | CircuitBay'.length
  const suffix = [' — Buy Online in India', ' — Buy in India', ''].find((sfx) => name.length + sfx.length + brand <= 65) ?? ''
  return `${name}${suffix}`
}

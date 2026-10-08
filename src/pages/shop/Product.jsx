import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { PageShell } from '../../components/layout/PageShell.jsx'
import { Section } from '../../components/ui/Section.jsx'
import { Photo } from '../../components/ui/Card.jsx'
import { Icon } from '../../components/ui/Icon.jsx'
import { ProductCard, Badges, Rating } from '../../components/shop/ProductCard.jsx'
import { ProjectCard } from '../../components/content/ProjectCard.jsx'
import { ProductReviews } from '../../components/shop/Reviews.jsx'
import { QtyStepper } from '../../components/shop/QtyStepper.jsx'
import { formatPrice, getProduct, products, shopCategories } from '../../content/shopData.js'
import { projects } from '../../content/siteContent.js'
import { useCart } from '../../context/CartContext.jsx'
import { useAuth } from '../../context/AuthContext.jsx'
import { trackAddToCart, trackViewItem } from '../../lib/analytics.js'
import { api } from '../../lib/api.js'
import { useApi } from '../../lib/useApi.js'
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
  const images = product.images ?? []

  useEffect(() => trackViewItem(product), [product])

  // Live stock from the API's uncached /stock endpoint once hydrated (the
  // prerendered page shows the catalog value; checkout re-checks on the
  // server either way)
  const live = useApi(`/stock?ids=${product.id}`)
  const stock = live.data?.stock[product.id] ?? product.stock

  // Wishlist heart (signed-in only; signed-out visitors are sent to sign in)
  const { user } = useAuth()
  const wishlist = useApi(user ? '/me/wishlist' : null)
  const [savedOverride, setSavedOverride] = useState(null)
  const saved = savedOverride ?? wishlist.data?.products.some((p) => p.id === product.id) ?? false
  const toggleWishlist = async () => {
    if (!user) return navigate(`/login?next=${encodeURIComponent(`/shop/product/${product.id}`)}`)
    setSavedOverride(!saved)
    try {
      await (saved ? api.del(`/me/wishlist/${product.id}`) : api.put(`/me/wishlist/${product.id}`))
    } catch {
      setSavedOverride(saved)
    }
  }

  const related = products.filter((p) => p.id !== product.id && p.category === product.category).slice(0, 4)
  const together = products.filter((p) => ['breadboard-830', 'jumper-wires', 'multimeter'].includes(p.id) && p.id !== product.id).slice(0, 2)
  const builds = projects.filter((p) => p.category.toLowerCase() === product.category || p.tags.some((t) => product.name.includes(t))).slice(0, 3)

  const addToCart = () => {
    add(product.id, qty)
    trackAddToCart(product, qty)
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
        image: product.images?.[0],
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
              <Photo src={images[image]} eager label={`${product.name} — photo ${image + 1}`} className="aspect-square w-full rounded-2xl" />
              {images.length > 1 && (
                <div className="mt-3 grid grid-cols-4 gap-3">
                  {images.map((src, i) => (
                    <button
                      key={src}
                      type="button"
                      onClick={() => setImage(i)}
                      aria-label={`Show photo ${i + 1}`}
                      aria-pressed={image === i}
                      className={`overflow-hidden rounded-xl border-2 ${image === i ? 'border-brand-600' : 'border-transparent'}`}
                    >
                      <Photo src={src} label="" className="aspect-square w-full" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div>
              <Badges badges={product.badges} />
              <h1 className="mt-3 font-heading text-3xl font-semibold tracking-tight text-ink-900 sm:text-4xl">{product.name}</h1>
              <div className="mt-3 flex items-center gap-4">
                <Rating value={product.rating} count={product.reviews} />
                <span className="chip">{product.level}</span>
              </div>
              <p className="mt-6 font-heading text-3xl font-semibold text-ink-900">{formatPrice(product.price)}</p>
              {/* Matches checkout: GST is added on top (see server/src/lib/money.js) */}
              <p className="mt-1 text-xs text-ink-400">+ {product.gstRate ?? 18}% GST, added at checkout</p>
              <p className={`mt-3 text-sm font-semibold ${stock < 10 ? 'text-navy-800' : 'text-brand-700'}`}>
                {stock === 0 ? 'Out of stock' : stock < 10 ? `Only ${stock} left` : 'In stock — ships in 24 hours'}
              </p>
              <p className="mt-6 text-lg leading-relaxed text-ink-600">{product.forWhat}</p>
              {product.build && (
                <p className="mt-3 text-sm text-ink-600">
                  <span className="font-semibold text-ink-900">You'll build: </span>
                  {product.build}
                </p>
              )}

              <div className="mt-8 flex flex-wrap items-center gap-3">
                <QtyStepper value={Math.min(qty, Math.max(stock, 1))} onChange={setQty} max={Math.max(stock, 1)} />
                <button
                  type="button"
                  onClick={addToCart}
                  disabled={stock === 0}
                  className="flex-1 rounded-xl border border-brand-600 px-6 py-3 text-sm font-semibold text-brand-700 transition-colors hover:bg-brand-500/5 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Add to cart
                </button>
                <button
                  type="button"
                  disabled={stock === 0}
                  onClick={() => {
                    add(product.id, qty)
                    navigate('/shop/checkout')
                  }}
                  className="flex-1 rounded-xl bg-brand-600 px-6 py-3 text-sm font-semibold text-white transition-all hover:bg-brand-700 hover:shadow-[0_0_24px_rgba(63,125,222,0.45)] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Buy now
                </button>
                <button
                  type="button"
                  onClick={toggleWishlist}
                  aria-pressed={saved}
                  aria-label={saved ? 'Remove from wishlist' : 'Save to wishlist'}
                  className={`flex h-12 w-12 items-center justify-center rounded-xl border transition-colors ${
                    saved ? 'border-brand-600 bg-brand-500/10 text-brand-700' : 'border-black/10 text-ink-600 hover:border-brand-600 hover:text-brand-700'
                  }`}
                >
                  <Icon name="heart" size={20} className={saved ? 'fill-current' : ''} />
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
      return <ProductReviews productId={product.id} />
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

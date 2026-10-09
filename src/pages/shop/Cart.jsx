import { Link } from 'react-router-dom'
import { PageShell } from '../../components/layout/PageShell.jsx'
import { PageHero, Section } from '../../components/ui/Section.jsx'
import { Button } from '../../components/ui/Button.jsx'
import { Photo } from '../../components/ui/Card.jsx'
import { Icon } from '../../components/ui/Icon.jsx'
import { ProductCard } from '../../components/shop/ProductCard.jsx'
import { OrderSummary } from '../../components/shop/OrderSummary.jsx'
import { QtyStepper } from '../../components/shop/QtyStepper.jsx'
import { formatPrice, products } from '../../content/shopData.js'
import { useCart } from '../../context/CartContext.jsx'
import { useLiveImages } from '../../lib/liveImages.js'

// C5 — items left, summary right, "Complete your build" add-ons below.
export function Cart() {
  const { items, subtotal, setQty, remove } = useCart()
  const imagesOf = useLiveImages()
  const inCart = new Set(items.map((l) => l.id))
  const addOns = products.filter((p) => ['breadboard-830', 'jumper-wires', 'multimeter', 'soldering-kit'].includes(p.id) && !inCart.has(p.id))

  return (
    <PageShell shop seo={{ title: 'Your cart', path: '/shop/cart', noindex: true }}>
      <PageHero compact title="Your cart" />

      <Section tone="soft" className="pt-10!">
        {items.length === 0 ? (
          <div className="card mx-auto max-w-xl p-12 text-center">
            <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-brand-500/10 text-brand-500">
              <Icon name="cart" size={30} />
            </span>
            <p className="mt-6 font-heading text-2xl font-semibold text-ink-900">Nothing here yet. What do you want to build?</p>
            <Button to="/shop" className="mt-8">
              Browse the bay
            </Button>
          </div>
        ) : (
          <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
            <ul className="card divide-y divide-black/5">
              {items.map(({ id, qty, product }) => (
                <li key={id} className="flex gap-4 p-5">
                  <Link to={`/shop/product/${id}`} className="shrink-0">
                    <Photo src={imagesOf(product)[0]} label="" className="h-20 w-20 rounded-lg sm:h-24 sm:w-24" />
                  </Link>
                  <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <Link to={`/shop/product/${id}`} className="font-heading font-semibold text-ink-900 hover:text-brand-600">
                        {product.name}
                      </Link>
                      <p className="text-sm text-ink-400">{formatPrice(product.price)} each</p>
                      <button type="button" onClick={() => remove(id)} className="mt-1 text-xs font-semibold text-ink-400 hover:text-brand-600">
                        Remove
                      </button>
                    </div>
                    <div className="flex items-center justify-between gap-6">
                      <QtyStepper value={qty} onChange={(n) => setQty(id, n)} max={product.stock} />
                      <span className="w-20 text-right font-heading font-semibold text-ink-900">{formatPrice(product.price * qty)}</span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>

            <div className="lg:sticky lg:top-40 lg:self-start">
              <OrderSummary items={items} subtotal={subtotal}>
                <Button to="/shop/checkout" className="w-full">
                  Proceed to checkout
                </Button>
                <Button to="/shop" variant="secondary" className="w-full">
                  Continue shopping
                </Button>
              </OrderSummary>
            </div>
          </div>
        )}
      </Section>

      {addOns.length > 0 && (
        <Section tone="light" title="Complete your build" subtitle="The bits every bench ends up needing.">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {addOns.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </Section>
      )}
    </PageShell>
  )
}

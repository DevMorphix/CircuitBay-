import { Link } from 'react-router-dom'
import { formatPrice } from '../../content/shopData.js'
import { useCart } from '../../context/CartContext.jsx'
import { trackEvent } from '../../lib/analytics.js'
import { Photo } from '../ui/Card.jsx'
import { Icon } from '../ui/Icon.jsx'

const BADGE_STYLES = {
  'Student Kit': 'bg-brand-600 text-white',
  'Beginner Friendly': 'bg-brand-500/10 text-brand-700',
  'Low stock': 'bg-navy-900 text-white',
}

export function Badges({ badges }) {
  if (!badges?.length) return null
  return (
    <div className="flex flex-wrap gap-1.5">
      {badges.map((b) => (
        <span key={b} className={`rounded-md px-2 py-0.5 text-[0.65rem] font-semibold ${BADGE_STYLES[b] ?? 'chip'}`}>
          {b}
        </span>
      ))}
    </div>
  )
}

// Renders only when the product has real reviews (none until the reviews
// system exists) — we never show placeholder ratings to customers.
export function Rating({ value, count }) {
  if (!count || !value) return null
  return (
    <span className="inline-flex items-center gap-1 text-xs text-ink-600">
      <Icon name="star" size={14} className="fill-brand-500 text-brand-500" />
      <span className="font-semibold text-ink-900">{value}</span>
      {count != null && <span className="text-ink-400">({count})</span>}
    </span>
  )
}

export function AddToCartButton({ product, className = '', label = 'Add to cart' }) {
  const { add } = useCart()
  return (
    <button
      type="button"
      onClick={() => {
        add(product.id)
        trackEvent('add_to_cart', { item_id: product.id, price: product.price })
      }}
      className={`inline-flex items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition-all hover:bg-brand-700 hover:shadow-[0_0_20px_rgba(63,125,222,0.4)] ${className}`}
    >
      <Icon name="cart" size={18} /> {label}
    </button>
  )
}

// Product card (Part C3): image, name, short spec, price, rating, Add to cart.
export function ProductCard({ product }) {
  const spec = Object.values(product.specs ?? {})[0]
  return (
    <article className="card card-hover group flex h-full flex-col overflow-hidden">
      <Link to={`/shop/product/${product.id}`} className="flex flex-1 flex-col">
        <div className="relative">
          <Photo src={product.images?.[0]} label={product.name} className="aspect-square w-full" />
          <div className="absolute left-3 top-3">
            <Badges badges={product.badges} />
          </div>
        </div>
        <div className="flex flex-1 flex-col p-4">
          <h3 className="font-heading text-base font-semibold text-ink-900 group-hover:text-brand-600">
            {product.name}
          </h3>
          {spec && <p className="mt-1 text-xs text-ink-400">{spec}</p>}
          <div className="mt-auto flex items-center justify-between pt-3">
            <span className="font-heading text-lg font-semibold text-ink-900">{formatPrice(product.price)}</span>
            <Rating value={product.rating} count={product.reviews} />
          </div>
        </div>
      </Link>
      <div className="px-4 pb-4">
        <AddToCartButton product={product} className="w-full" />
      </div>
    </article>
  )
}

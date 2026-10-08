import { Link } from 'react-router-dom'
import { formatPrice } from '../../content/shopData.js'
import { Photo } from '../ui/Card.jsx'
import { Icon } from '../ui/Icon.jsx'
import { AddToCartButton, Badges } from './ProductCard.jsx'

// Featured Project Kit card (Part C2): photo, name, skill level, what you'll
// build, what's inside, price, Add to cart.
export function KitCard({ kit }) {
  return (
    <article className="card card-hover group flex h-full flex-col overflow-hidden">
      <Link to={`/shop/product/${kit.id}`} className="block">
        <div className="relative">
          <Photo src={kit.images?.[0]} label={`${kit.name} photo`} className="aspect-[4/3] w-full" />
          <div className="absolute left-3 top-3">
            <Badges badges={kit.badges.filter((b) => b !== 'Student Kit')} />
          </div>
        </div>
      </Link>
      <div className="flex flex-1 flex-col p-6">
        <span className="chip self-start">{kit.level}</span>
        <Link to={`/shop/product/${kit.id}`}>
          <h3 className="mt-3 font-heading text-xl font-semibold text-ink-900 group-hover:text-brand-600">{kit.name}</h3>
        </Link>
        <p className="mt-3 text-sm text-ink-600">
          <span className="font-semibold text-ink-900">You'll build: </span>
          {kit.build}
        </p>
        <div className="mt-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-ink-400">What's inside</p>
          <ul className="mt-2 space-y-1.5">
            {kit.inside.slice(0, 4).map((item) => (
              <li key={item} className="flex items-start gap-2 text-sm text-ink-600">
                <Icon name="check" size={16} className="mt-0.5 shrink-0 text-brand-500" />
                {item}
              </li>
            ))}
          </ul>
        </div>
        <div className="mt-auto flex items-center justify-between gap-3 pt-6">
          <span className="font-heading text-2xl font-semibold text-ink-900">{formatPrice(kit.price)}</span>
          <AddToCartButton product={kit} />
        </div>
      </div>
    </article>
  )
}

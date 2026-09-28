import { useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { shopHome, shopCategories } from '../../content/shopData.js'
import { useCart } from '../../context/CartContext.jsx'
import { useHydrated } from '../../lib/hydration.js'
import { Icon } from '../ui/Icon.jsx'
import { Logo } from './Logo.jsx'

// Shop header (Part C1): slim announcement bar → logo + search + cart →
// category row. Mobile gets a sticky cart button (Part E).
export function ShopHeader() {
  const cart = useCart()
  const count = useHydrated() ? cart.count : 0
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)

  const submit = (e) => {
    e.preventDefault()
    navigate(`/shop/category/all${q.trim() ? `?q=${encodeURIComponent(q.trim())}` : ''}`)
  }

  const search = (
    <form onSubmit={submit} role="search" className="relative w-full">
      <label htmlFor="shop-search" className="sr-only">
        Search parts and kits
      </label>
      <Icon name="search" size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
      <input
        id="shop-search"
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search ESP32, sensors, kits…"
        className="field pl-10!"
      />
    </form>
  )

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-40 border-b border-black/5 bg-white/95 shadow-sm backdrop-blur">
        <div className="bg-navy-900 px-4 py-2 text-center text-xs font-medium text-white/85">
          {shopHome.announcement}
        </div>
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3 sm:px-6">
          <Logo suffix="Shop" />
          <div className="hidden flex-1 md:block">{search}</div>
          <div className="ml-auto flex items-center gap-1 md:ml-0">
            <Link
              to="/account"
              aria-label="My account"
              className="flex h-10 w-10 items-center justify-center rounded-xl text-ink-600 hover:bg-brand-500/10 hover:text-brand-600"
            >
              <Icon name="user" size={22} />
            </Link>
            <Link
              to="/shop/cart"
              aria-label={`Cart, ${count} item${count === 1 ? '' : 's'}`}
              className="relative flex h-10 items-center gap-2 rounded-xl px-2.5 text-ink-600 hover:bg-brand-500/10 hover:text-brand-600"
            >
              <Icon name="cart" size={22} />
              <span className="hidden text-sm font-semibold sm:inline">Cart</span>
              {count > 0 && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-600 px-1 text-[0.65rem] font-bold text-white">
                  {count}
                </span>
              )}
            </Link>
            <button
              type="button"
              onClick={() => setOpen((o) => !o)}
              aria-expanded={open}
              aria-label={open ? 'Close menu' : 'Open menu'}
              className="flex h-10 w-10 items-center justify-center rounded-xl text-ink-900 hover:bg-brand-500/10 md:hidden"
            >
              <Icon name={open ? 'close' : 'menu'} />
            </button>
          </div>
        </div>
        <div className="px-4 pb-3 md:hidden">{search}</div>
        <nav
          aria-label="Shop categories"
          className={`${open ? 'block' : 'hidden'} border-t border-black/5 md:block`}
        >
          <ul className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-2 sm:px-6 md:flex-row md:gap-6">
            {shopCategories.map((c) => (
              <li key={c.slug}>
                <NavLink
                  to={`/shop/category/${c.slug}`}
                  onClick={() => setOpen(false)}
                  className={({ isActive }) =>
                    `block py-2 text-sm font-medium md:py-1 ${isActive ? 'text-brand-600' : 'text-ink-600 hover:text-ink-900'}`
                  }
                >
                  {c.label}
                </NavLink>
              </li>
            ))}
            <li className="md:ml-auto">
              <Link to="/shop/track" className="block py-2 text-sm font-medium text-ink-600 hover:text-ink-900 md:py-1">
                Track order
              </Link>
            </li>
            <li>
              <Link to="/faq" className="block py-2 text-sm font-medium text-ink-600 hover:text-ink-900 md:py-1">
                FAQ
              </Link>
            </li>
          </ul>
        </nav>
      </header>

      {count > 0 && (
        <Link
          to="/shop/cart"
          className="fixed inset-x-4 bottom-4 z-40 flex items-center justify-center gap-2 rounded-xl bg-brand-600 py-3.5 text-sm font-semibold text-white shadow-[0_8px_24px_rgba(63,125,222,0.45)] md:hidden"
        >
          <Icon name="cart" size={20} /> View cart ({count})
        </Link>
      )}
    </>
  )
}

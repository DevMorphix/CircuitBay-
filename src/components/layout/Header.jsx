import { useEffect, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { nav } from '../../content/siteContent.js'
import { useCart } from '../../context/CartContext.jsx'
import { useHydrated } from '../../lib/hydration.js'
import { Button } from '../ui/Button.jsx'
import { Icon } from '../ui/Icon.jsx'
import { Logo } from './Logo.jsx'

// Main-site header (Part E): Shop · Learn · Community · For Educators ·
// About · Start Building. Hamburger drawer below md.
export function Header() {
  const [scrolled, setScrolled] = useState(false)
  // The drawer remembers which URL it was opened on, so navigating
  // anywhere closes it without an effect.
  const [openAt, setOpenAt] = useState(null)
  const cart = useCart()
  // Cart lives in localStorage — show the count once hydrated
  const count = useHydrated() ? cart.count : 0
  const { pathname, hash } = useLocation()
  const here = pathname + hash
  const open = openAt === here

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const linkClass = ({ isActive }) =>
    `text-sm font-medium transition-colors ${isActive ? 'text-brand-600' : 'text-ink-600 hover:text-ink-900'}`

  return (
    <header
      className={`fixed inset-x-0 top-0 z-40 bg-white/90 backdrop-blur transition-shadow duration-300 ${
        scrolled || open ? 'border-b border-black/5 shadow-sm' : 'border-b border-transparent'
      }`}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <Logo />

        <nav className="hidden items-center gap-7 md:flex" aria-label="Primary">
          {nav.map((item) =>
            item.to.includes('#') ? (
              <Link key={item.to} to={item.to} className={linkClass({ isActive: false })}>
                {item.label}
              </Link>
            ) : (
              <NavLink key={item.to} to={item.to} className={linkClass}>
                {item.label}
              </NavLink>
            ),
          )}
        </nav>

        <div className="flex items-center gap-2">
          <Link
            to="/shop/cart"
            aria-label={`Cart, ${count} item${count === 1 ? '' : 's'}`}
            className="relative flex h-10 w-10 items-center justify-center rounded-xl text-ink-600 transition-colors hover:bg-brand-500/10 hover:text-brand-600"
          >
            <Icon name="cart" size={22} />
            {count > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-600 px-1 text-[0.65rem] font-bold text-white">
                {count}
              </span>
            )}
          </Link>
          <Button
            to="/shop"
            variant="primary"
            className="hidden px-5! py-2.5! text-xs sm:inline-flex"
            event={{ name: 'cta_click', params: { cta: 'header_start_building' } }}
          >
            Start Building
          </Button>
          <button
            type="button"
            onClick={() => setOpenAt(open ? null : here)}
            aria-expanded={open}
            aria-controls="mobile-nav"
            aria-label={open ? 'Close menu' : 'Open menu'}
            className="flex h-10 w-10 items-center justify-center rounded-xl text-ink-900 hover:bg-brand-500/10 md:hidden"
          >
            <Icon name={open ? 'close' : 'menu'} />
          </button>
        </div>
      </div>

      {open && (
        <nav id="mobile-nav" aria-label="Mobile" className="border-t border-black/5 bg-white px-4 pb-6 pt-2 md:hidden">
          <ul className="flex flex-col">
            {nav.map((item) => (
              <li key={item.to}>
                <Link
                  to={item.to}
                  className="block border-b border-black/5 py-3.5 font-heading text-lg font-semibold text-ink-900"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
          <Button to="/shop" variant="primary" className="mt-5 w-full">
            Start Building
          </Button>
        </nav>
      )}
    </header>
  )
}

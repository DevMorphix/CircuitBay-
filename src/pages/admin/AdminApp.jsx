import { lazy, Suspense, useState } from 'react'
import { Link, Navigate, NavLink, Route, Routes, useLocation } from 'react-router-dom'
import { Seo } from '../../components/seo/Seo.jsx'
import { Logo } from '../../components/layout/Logo.jsx'
import { Icon } from '../../components/ui/Icon.jsx'
import { useAuth } from '../../context/AuthContext.jsx'
import { Dashboard } from './Dashboard.jsx'

const section = (load, name) => lazy(() => load().then((m) => ({ default: m[name] })))
const Orders = section(() => import('./Orders.jsx'), 'Orders')
const OrderDetail = section(() => import('./Orders.jsx'), 'OrderDetail')
const Products = section(() => import('./Products.jsx'), 'Products')
const ProductEditor = section(() => import('./Products.jsx'), 'ProductEditor')
const Inbox = section(() => import('./Inbox.jsx'), 'Inbox')
const ProjectsAdmin = section(() => import('./ProjectsAdmin.jsx'), 'ProjectsAdmin')
const Articles = section(() => import('./Articles.jsx'), 'Articles')
const ArticleEditor = section(() => import('./Articles.jsx'), 'ArticleEditor')

const NAV = [
  { to: '/admin', label: 'Dashboard', icon: 'bolt', end: true },
  { to: '/admin/orders', label: 'Orders', icon: 'box' },
  { to: '/admin/products', label: 'Products', icon: 'kit' },
  { to: '/admin/inbox', label: 'Inbox', icon: 'mail' },
  { to: '/admin/projects', label: 'Projects', icon: 'users' },
  { to: '/admin/articles', label: 'Articles', icon: 'book' },
]

// /admin/* — CircuitBay back office. Only accounts with role "admin"
// (emails listed in the API's ADMIN_EMAILS) can use it; the API enforces
// this on every request too.
export function AdminApp() {
  const { user, status, logout } = useAuth()
  const { pathname } = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)

  if (status === 'signed-out') return <Navigate to={`/login?next=${encodeURIComponent(pathname)}`} replace />

  return (
    <>
      <Seo title="Admin" path="/admin" noindex />
      {status === 'loading' ? (
        <p className="p-10 text-center text-ink-600" aria-busy="true">Loading…</p>
      ) : user.role !== 'admin' ? (
        <div className="mx-auto max-w-md p-10 text-center">
          <h1 className="font-heading text-2xl font-semibold text-ink-900">No access</h1>
          <p className="mt-2 text-ink-600">This area is for the CircuitBay team. You're signed in as {user.email ?? user.phone}.</p>
          <div className="mt-6 flex justify-center gap-6">
            <button type="button" onClick={logout} className="font-semibold text-brand-700">Sign in with another account</button>
            <Link to="/" className="font-semibold text-brand-700">Back to the site →</Link>
          </div>
        </div>
      ) : (
        <div className="min-h-screen bg-surface-soft lg:grid lg:grid-cols-[240px_1fr]">
          <aside className="section-dark flex flex-col px-4 py-5 lg:sticky lg:top-0 lg:h-screen">
            <div className="flex items-center justify-between">
              <Logo dark size={24} />
              <button type="button" className="text-white lg:hidden" onClick={() => setMenuOpen((o) => !o)} aria-expanded={menuOpen} aria-label="Toggle admin menu">
                <Icon name={menuOpen ? 'close' : 'menu'} />
              </button>
            </div>
            <p className="mt-2 text-xs font-semibold uppercase tracking-widest text-brand-300">Admin</p>
            <nav aria-label="Admin" className={`${menuOpen ? 'block' : 'hidden'} mt-6 flex-1 lg:block`}>
              <ul className="space-y-1">
                {NAV.map((n) => (
                  <li key={n.to}>
                    <NavLink
                      to={n.to}
                      end={n.end}
                      onClick={() => setMenuOpen(false)}
                      className={({ isActive }) =>
                        `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold ${isActive ? 'bg-white/10 text-white' : 'text-white/70 hover:bg-white/5 hover:text-white'}`
                      }
                    >
                      <Icon name={n.icon} size={18} /> {n.label}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </nav>
            <div className={`${menuOpen ? 'block' : 'hidden'} mt-6 border-t border-white/10 pt-4 text-sm lg:block`}>
              <p className="truncate text-white/70">{user.email ?? user.phone}</p>
              <div className="mt-2 flex gap-4">
                <Link to="/" className="font-semibold text-brand-300 hover:text-white">View site</Link>
                <button type="button" onClick={logout} className="font-semibold text-brand-300 hover:text-white">Sign out</button>
              </div>
            </div>
          </aside>

          <main id="main" className="min-w-0 px-4 py-8 sm:px-8">
            <Suspense fallback={<p className="text-ink-600">Loading…</p>}>
              <Routes>
                <Route index element={<Dashboard />} />
                <Route path="orders" element={<Orders />} />
                <Route path="orders/:id" element={<OrderDetail />} />
                <Route path="products" element={<Products />} />
                <Route path="products/new" element={<ProductEditor />} />
                <Route path="products/:id" element={<ProductEditor />} />
                <Route path="inbox" element={<Inbox />} />
                <Route path="projects" element={<ProjectsAdmin />} />
                <Route path="articles" element={<Articles />} />
                <Route path="articles/new" element={<ArticleEditor />} />
                <Route path="articles/:slug" element={<ArticleEditor />} />
                <Route path="*" element={<Navigate to="/admin" replace />} />
              </Routes>
            </Suspense>
          </main>
        </div>
      )}
    </>
  )
}

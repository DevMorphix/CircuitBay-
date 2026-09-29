import { lazy, Suspense } from 'react'
import { Routes, Route } from 'react-router-dom'
import { CartProvider } from './context/CartContext.jsx'
import { AuthProvider } from './context/AuthContext.jsx'
import { CookieConsent } from './components/layout/CookieConsent.jsx'
import { ScrollToTop } from './components/layout/ScrollToTop.jsx'
import { ErrorBoundary } from './components/layout/ErrorBoundary.jsx'
import { Home } from './pages/Home.jsx'

// Home ships in the main bundle (it's the landing page); every other page
// is split into its own chunk and loaded on first visit.
const page = (load, name) => lazy(() => load().then((m) => ({ default: m[name] })))

const BlogHome = page(() => import('./pages/BlogHome.jsx'), 'BlogHome')
const Article = page(() => import('./pages/Article.jsx'), 'Article')
const About = page(() => import('./pages/About.jsx'), 'About')
const Contact = page(() => import('./pages/Contact.jsx'), 'Contact')
const Projects = page(() => import('./pages/Projects.jsx'), 'Projects')
const Faq = page(() => import('./pages/Faq.jsx'), 'Faq')
const Account = page(() => import('./pages/Account.jsx'), 'Account')
const ShopHome = page(() => import('./pages/shop/ShopHome.jsx'), 'ShopHome')
const Category = page(() => import('./pages/shop/Category.jsx'), 'Category')
const Product = page(() => import('./pages/shop/Product.jsx'), 'Product')
const Cart = page(() => import('./pages/shop/Cart.jsx'), 'Cart')
const Checkout = page(() => import('./pages/shop/Checkout.jsx'), 'Checkout')
const OrderConfirmation = page(() => import('./pages/shop/OrderConfirmation.jsx'), 'OrderConfirmation')
const Track = page(() => import('./pages/shop/Track.jsx'), 'Track')
const PrivacyPolicy = page(() => import('./pages/PrivacyPolicy.jsx'), 'PrivacyPolicy')
const Terms = page(() => import('./pages/Terms.jsx'), 'Terms')
const RefundPolicy = page(() => import('./pages/ShopPolicies.jsx'), 'RefundPolicy')
const ShippingPolicy = page(() => import('./pages/ShopPolicies.jsx'), 'ShippingPolicy')
const NotFound = page(() => import('./pages/NotFound.jsx'), 'NotFound')
const Schools = page(() => import('./pages/Schools.jsx'), 'Schools')
const FinalYearProjects = page(() => import('./pages/FinalYearProjects.jsx'), 'FinalYearProjects')
const RequestPart = page(() => import('./pages/RequestPart.jsx'), 'RequestPart')
const Login = page(() => import('./pages/Auth.jsx'), 'Login')
const Register = page(() => import('./pages/Auth.jsx'), 'Register')
const ForgotPassword = page(() => import('./pages/Auth.jsx'), 'ForgotPassword')
const ResetPassword = page(() => import('./pages/Auth.jsx'), 'ResetPassword')
const AdminApp = page(() => import('./pages/admin/AdminApp.jsx'), 'AdminApp')

// Shown for the split second a page chunk is loading
function PageLoading() {
  return <div className="min-h-screen bg-white" aria-busy="true" />
}

// Router-agnostic: main.jsx wraps it in BrowserRouter, the build-time
// prerenderer (entry-server.jsx) in StaticRouter.
export default function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <ScrollToTop />
        <a href="#main" className="skip-link">
          Skip to content
        </a>
        <ErrorBoundary>
          <Suspense fallback={<PageLoading />}>
            <Routes>
              <Route path="/" element={<Home />} />

              <Route path="/blog" element={<BlogHome />} />
              <Route path="/blog/:slug" element={<Article />} />

              <Route path="/shop" element={<ShopHome />} />
              <Route path="/shop/category/:slug" element={<Category />} />
              <Route path="/shop/product/:id" element={<Product />} />
              <Route path="/shop/cart" element={<Cart />} />
              <Route path="/shop/checkout" element={<Checkout />} />
              <Route path="/shop/order/:id" element={<OrderConfirmation />} />
              <Route path="/shop/track" element={<Track />} />
              <Route path="/account" element={<Account />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/admin/*" element={<AdminApp />} />
              <Route path="/faq" element={<Faq />} />

              <Route path="/about" element={<About />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/projects" element={<Projects />} />
              <Route path="/schools" element={<Schools />} />
              <Route path="/final-year-projects" element={<FinalYearProjects />} />
              <Route path="/request-a-part" element={<RequestPart />} />

              <Route path="/privacy-policy" element={<PrivacyPolicy />} />
              <Route path="/terms" element={<Terms />} />
              <Route path="/refund-policy" element={<RefundPolicy />} />
              <Route path="/shipping-policy" element={<ShippingPolicy />} />

                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
        </ErrorBoundary>
          <CookieConsent />
      </CartProvider>
    </AuthProvider>
  )
}

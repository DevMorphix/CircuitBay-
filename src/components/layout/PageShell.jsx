import { Header } from './Header.jsx'
import { ShopHeader } from './ShopHeader.jsx'
import { Footer } from './Footer.jsx'
import { Seo } from '../seo/Seo.jsx'

// Wraps every page so they all share the same header, footer, theme and
// SEO handling. `seo` = { title, description, path, noindex, jsonLd, … }
// (see lib/seo.js buildHead). `shop` swaps in the shop header.
export function PageShell({ shop = false, seo, children }) {
  return (
    <>
      <Seo {...seo} />
      {shop ? <ShopHeader /> : <Header />}
      <main id="main" className={shop ? 'pt-[9.5rem] md:pt-[8.25rem]' : ''}>
        {children}
      </main>
      <Footer />
    </>
  )
}

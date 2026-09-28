import { PageShell } from '../../components/layout/PageShell.jsx'
import { Section } from '../../components/ui/Section.jsx'
import { Reveal } from '../../components/ui/Reveal.jsx'
import { Button } from '../../components/ui/Button.jsx'
import { ArrowLink, Card, Photo } from '../../components/ui/Card.jsx'
import { IconTile } from '../../components/ui/Icon.jsx'
import { KitCard } from '../../components/shop/KitCard.jsx'
import { ProductCard } from '../../components/shop/ProductCard.jsx'
import { TrustStrip } from '../../components/shop/TrustStrip.jsx'
import { bestsellers, kits, shopCategories, shopHome } from '../../content/shopData.js'
import { schema } from '../../lib/seo.js'

// C1 — hero → category tiles → Featured Project Kits → bestsellers →
// "Can't find a part?" → trust strip → footer.
export function ShopHome() {
  return (
    <PageShell
      shop
      seo={{
        title: 'Electronics & Robotics Kits for Students — Shop',
        description: 'Shop ESP32 and Arduino boards, sensors, IoT and robotics project kits and maker tools. Student-friendly support and tracked delivery across India.',
        path: '/shop',
        jsonLd: [
          schema.breadcrumbs([{ name: 'Home', path: '/' }, { name: 'Shop', path: '/shop' }]),
          schema.itemList(kits.map((k) => ({ name: k.name, path: `/shop/product/${k.id}` }))),
        ],
      }}
    >
      <section className="section-dark px-4 py-16 sm:px-6 md:py-20">
        <div className="mx-auto grid max-w-6xl items-center gap-10 lg:grid-cols-2">
          <Reveal>
            <p className="eyebrow mb-4">{shopHome.hero.eyebrow}</p>
            <h1 className="font-heading text-4xl font-semibold tracking-tight text-white sm:text-6xl">{shopHome.hero.headline}</h1>
            <p className="mt-5 max-w-md text-lg text-white/70">{shopHome.hero.subhead}</p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Button href="#kits">{shopHome.hero.cta} →</Button>
              <Button to="/shop/category/all" variant="secondary-dark">
                Browse all parts
              </Button>
            </div>
          </Reveal>
          <Reveal delay={0.1}>
            <Photo label="Kit hero shot" className="aspect-[4/3] rounded-2xl" />
          </Reveal>
        </div>
      </section>

      <Section tone="light" eyebrow="SHOP BY CATEGORY" title="Pick your lane.">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {shopCategories.map((c, i) => (
            <Reveal key={c.slug} delay={i * 0.05}>
              <Card to={`/shop/category/${c.slug}`} className="flex h-full flex-col items-center gap-3 px-4 py-7 text-center">
                <IconTile name={c.icon} className="group-hover:rotate-6" />
                <span className="font-heading text-sm font-semibold text-ink-900">{c.label}</span>
                <span className="text-xs leading-snug text-ink-400">{c.blurb}</span>
              </Card>
            </Reveal>
          ))}
        </div>
      </Section>

      <Section tone="soft" id="kits" eyebrow="FEATURED PROJECT KITS FOR STUDENTS" title={shopHome.kitsHeadline}>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {kits.map((k, i) => (
            <Reveal key={k.id} delay={i * 0.06}>
              <KitCard kit={k} />
            </Reveal>
          ))}
        </div>
      </Section>

      <Section tone="light" eyebrow="BESTSELLERS" title="What builders reach for first.">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 lg:gap-6">
          {bestsellers.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </Section>

      <Section tone="dark">
        <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
          <div>
            <h2 className="font-heading text-3xl font-semibold text-white sm:text-4xl">{shopHome.cantFind.headline}</h2>
            <p className="mt-3 text-white/70">{shopHome.cantFind.body}</p>
          </div>
          <Button to="/contact">{shopHome.cantFind.cta} →</Button>
        </div>
      </Section>

      <Section tone="grey" className="py-12! md:py-14!">
        <TrustStrip />
        <div className="mt-8 text-center">
          <ArrowLink to="/faq">Questions? Read the FAQ</ArrowLink>
        </div>
      </Section>
    </PageShell>
  )
}

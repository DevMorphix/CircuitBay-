# Content checklist

What still needs real client input. Every item is marked `TODO_CLIENT` in the
code, at the exact line to change.

## Copy
- [ ] Sign-off on all draft copy (`src/content/siteContent.js`, `blogData.js`, `shopData.js`)
- [ ] The client's own OUR STORY text for the About page (`siteContent.about.story`)
- [ ] Founder name, photo and bio, plus real timeline dates (`siteContent.about`)
- [ ] Real stats (builders reached, projects built, workshops) (`siteContent.about.stats`)
- [ ] Real featured projects: builder names, component tags, photos (`siteContent.projects`)
- [ ] Real blog articles and authors (`blogData.js`, or the admin API)
- [ ] Contact channels: email, phone/WhatsApp, address (`siteContent.contact`)

## Visual assets
- [ ] Final logo (SVG + PNG) and favicon set (see the comment in `src/components/layout/Logo.jsx`)
- [ ] Real workshop and student photography. Every grey "blueprint" box is a placeholder (`Photo` component)
- [ ] School and college logos for the educators trust strip (`siteContent.educators.trust`)
- [ ] Product photos and datasheets (uploaded through `POST /api/admin/uploads`)

## Shop and policies
- [ ] Real catalog: products, prices and stock (admin API; seed data is illustrative)
- [ ] Shipping fees, free-shipping threshold and GST treatment (`server/src/lib/money.js`)
- [ ] Refund, shipping, privacy and terms text reviewed by counsel (`src/pages/*Policy*`, `Terms.jsx`)
- [ ] FAQ answers confirmed (`shopData.faqGroups`)

## SEO (needs client input)
- [ ] Social profile URLs → `SITE.sameAs` in `src/lib/seo.js` (helps win the "CircuitBay" brand search)
- [ ] Final logo file → `SITE.logo` (Organization schema)
- [ ] Real product photos (the Product schema currently uses the generic OG image)
- [ ] Real author names and bios for articles
- [ ] Publish the two draft articles (AirLoo build log, workshop recap) with real details
- [ ] ATL package contents, GeM status and past schools for `/schools` (`src/content/landingData.js`)
- [ ] Confirm the region served (local landing pages + Google Business Profile, if there's a physical location)

## Launch tasks (SEO)
- [ ] Deploy `dist/` to Cloudflare Pages; redirect `www.circuitbay.in` → `circuitbay.in` (Bulk Redirect rule)
- [ ] Google Search Console: verify the domain and submit `https://circuitbay.in/sitemap.xml`
- [ ] Bing Webmaster Tools (import from Search Console)
- [ ] Check rich results for a product, article and FAQ page with Google's Rich Results Test
- [ ] Build backlinks: college ECE/CSE departments, hackathons, maker communities, the AIM/ATL vendor directory

## Accounts and services
- [ ] Cloudflare: D1 database id and R2 bucket (`server/wrangler.toml`)
- [ ] Razorpay live keys and webhook secret
- [ ] Resend: verified sending domain
- [ ] MSG91: DLT-registered sender and OTP template
- [ ] Real social links (`siteContent.footer.social`)
- [ ] Analytics ID (`src/lib/analytics.js`)

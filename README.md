# CircuitBay

Website, blog and shop for CircuitBay (**Create. Break. Learn.**), with its API.

```
circuitbay-landing/
├── src/        React 19 + Vite + Tailwind v4 frontend
├── public/     static assets (story-reel frames are WebP, ~23 KB each)
├── scripts/    build-time prerendering + SEO checks
└── server/     API: Hono on Cloudflare Workers + D1 (database) + R2 (files)
```

## Run it locally

```bash
# API       → http://localhost:8787   (local SQLite, fake payments, emails/OTPs printed to the console)
cd server
npm install
npm run db:seed:local
npm run dev

# frontend  → http://localhost:5173   (Vite proxies /api and /media to the API)
npm install
npm run dev
```

In development, checkout completes without a real payment, and OTP codes and
emails are printed in the API's terminal.

## Build and deploy

`npm run build` makes a production build in `dist/`. Every public page is
prerendered to HTML with its own title, description, canonical and structured
data, along with `sitemap.xml`, `404.html` and Cloudflare Pages routing. The
build fails if any page breaks the SEO checks.

- **Frontend:** deploy `dist/` to Cloudflare Pages with these build settings
  (see `.env.example`):
  - `VITE_API_URL`: the API's public URL, used by the browser
  - `CONTENT_API_URL`: the same URL. The build pulls the live catalog
    (products, articles, projects) from it before prerendering, so the pages
    match what the team edits in `/admin`.
  - `VITE_GA_MEASUREMENT_ID` / `VITE_SENTRY_DSN`: Google Analytics and Sentry
    (optional; empty = off)

  Create a **deploy hook** for the Pages project and set it as the API secret
  `SITE_DEPLOY_HOOK_URL`. The admin "Publish site changes" button uses it.
- **API:** see `server/README.md` (Cloudflare Workers + D1 + R2, Razorpay,
  Resend, MSG91).

CI (`.github/workflows/ci.yml`) runs lint, the prerendered build with SEO
checks, and the API test suite on every push.

## Architecture

```
 Browser ──► Cloudflare CDN ──► static site (dist/)            cached at the edge
    │
    └──────► api.circuitbay.in  (Cloudflare Worker, auto-scales)
               │  edge cache ◄── public reads (catalog, blog, projects)
               ├─ D1  (SQLite)   users, orders, products, stock, content…
               ├─ R2  (files)    product photos, datasheets, uploads
               ├─ Razorpay       payments + signed webhooks
               ├─ Shiprocket     courier bookings + tracking webhooks
               ├─ Resend         email       └─ MSG91  SMS OTP
               └─ Cron (10 min)  release unpaid stock holds, cleanup
```

Product, blog and project pages are prerendered from the API catalog at build
time (`scripts/pull-content.js` writes `src/content/data/`). The committed data
files are the seed used when no API is configured, and they also seed the API.

At runtime the site uses the API for sign-in (email/password or phone OTP),
checkout with Razorpay, order tracking, the account area (orders, addresses,
wishlist, profile), live stock, and every form (contact, workshop requests,
newsletter, project submissions, part requests).

## Admin

The back office is at `/admin`, part of the same app. It's only for accounts
whose email is listed in the API's `ADMIN_EMAILS` (sign up with that email;
the API checks the role on every request).

| Screen | What it does |
|---|---|
| Dashboard | 30-day sales, orders to fulfil, refunds needed, low stock, inbox counts |
| Orders | Search/filter; book the courier (Shiprocket) in one click and print the label, then tracking moves orders to shipped → out for delivery → delivered automatically, with customer emails (or update statuses by hand); cancel (stock returns); refund through Razorpay in one click; GST invoice |
| Products | Create/edit (photos, datasheet PDF, specs, badges, kit contents), quick stock edits, hide from shop |
| Coupons | Create percent, rupees-off or free-shipping codes with a minimum order, dates and use limits; switch off any time; see paid orders and discount given per code |
| Reviews | Approve or reject reviews from verified buyers, and reply publicly; the product rating updates automatically |
| Inbox | Contact messages and part requests, workshop requests (new → contacted → scheduled → closed), newsletter list + CSV export |
| Projects | Review community submissions, edit, add a photo, publish/feature/reject |
| Articles | Markdown editor with a formatting toolbar, live preview and image upload (headings, **bold**/*italic*, links, bullet and numbered lists, tables, code, images, diagram placeholders); cover image, drafts |

Checkout prices, stock and orders change immediately. Product, blog and
project pages are prerendered, so after editing them click **Publish site
changes** in the admin sidebar. The site rebuilds from the API in about two
minutes.

## Roadmap

Status of everything left before (and after) launch. Code items are done in
this order, one commit each. Search the code for `TODO_CLIENT` to find every
placeholder that needs real client input.

### Code

- [x] Admin dashboard (`/admin`)
- [x] Build product, blog and project pages from the API catalog (so admin edits reach the site) + "Publish site changes" button
- [x] GST tax invoices for every order (sequential per financial year, CGST+SGST / IGST by place of supply, per-product HSN + rate, printable, for customers and admins)
- [x] GST credit notes when an invoiced order is cancelled (automatic, own CN/ sequence, printable for customers and admins)
- [x] Refunds sent from admin through Razorpay's API (one click, can't double-refund, customer emailed; failed refunds reopen via webhook)
- [x] Error monitoring (Sentry for the site and API; friendly error screen) + analytics (GA4 e-commerce events, after consent)
- [x] Email polish: branded HTML emails (with text versions), email confirmation on sign-up / email change, newsletter welcome + unsubscribe page + one-click unsubscribe, optional Resend audience sync
- [x] Coupons: percent / rupees off / free shipping, minimum order, dates, total and per-customer limits; applied before GST (shown on the invoice); uses reserved at checkout and given back if unpaid; admin screen with usage
- [x] Reviews from verified buyers: only customers with a delivered order can review (guest orders count once the email is confirmed); admin approval + public replies; ratings on product pages, cards and Google product data come only from approved reviews
- [x] Courier integration (Shiprocket): one-click booking from the admin (AWB, pickup, label), automatic tracking updates by webhook with polling as a backstop, customer emails at each step, courier problems flagged on the dashboard
- [ ] Automated browser tests for sign-in, checkout and admin

### Client content

- [ ] Real products, prices, stock, photos and datasheets (enter them in `/admin`)
- [ ] Company story, founder bio and photo, real stats, school logos, project photos and builder names
- [ ] Logo files, social links, contact email/phone/address
- [ ] Shipping fees, return window, FAQ answers
- [ ] GST decisions with the CA: prices shown with or without GST (today: GST is added at checkout), GST on shipping, invoice layout review, coupon discounts shown on the invoice before tax
- [ ] GST details: legal name, GSTIN, registered address/state (API settings `BUSINESS_*`) and an HSN code for every product
- [ ] Privacy, terms, refund and shipping policies reviewed by a lawyer
- [ ] ATL package details and regions served (`/schools`)
- [ ] Sign-off on all draft copy; expert review of the technical articles

### Accounts and setup

- [ ] Cloudflare: D1 database, R2 bucket, Workers Paid plan, Pages project, domains, www → apex redirect
- [ ] Razorpay: KYC, test keys (verify the real payment window), live keys, webhook
- [ ] Resend: verify the sending domain; optionally create an audience for the newsletter (`RESEND_AUDIENCE_ID`)
- [ ] MSG91: DLT registration, sender ID, OTP template
- [ ] Shiprocket: KYC, pickup address, API user, webhook (steps in `server/README.md`); packed weights for products
- [ ] Google: Search Console + sitemap, Analytics (GA4 ID → `VITE_GA_MEASUREMENT_ID`), Business Profile
- [ ] Sentry: create a project; set `VITE_SENTRY_DSN` (site) and `SENTRY_DSN` (API secret), and add alert rules
- [ ] Admin emails and secret keys configured in Cloudflare

### After launch

- [ ] Links from colleges, hackathons and the ATL vendor directory
- [ ] Publish articles regularly (the two draft project write-ups first)
- [ ] Re-measure page speed on the live site

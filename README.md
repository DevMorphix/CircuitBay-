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
| Orders | Search/filter; move orders placed → confirmed → packed → shipped (courier + tracking no.) → delivered, with customer emails; cancel (stock returns); record Razorpay refunds |
| Products | Create/edit (photos, datasheet PDF, specs, badges, kit contents), quick stock edits, hide from shop |
| Inbox | Contact messages and part requests, workshop requests (new → contacted → scheduled → closed), newsletter list + CSV export |
| Projects | Review community submissions, edit, add a photo, publish/feature/reject |
| Articles | Block editor (headings, paragraphs, lists, tables, code), cover image, drafts |

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
- [ ] GST tax invoices for every order
- [ ] Refunds sent from admin through Razorpay's API (today: refund in the Razorpay dashboard, then record it in admin)
- [ ] Error monitoring (Sentry) + analytics ID
- [ ] Email polish: HTML templates, email verification, unsubscribe page, newsletter sync
- [ ] Coupons (the coupon box is on screen but not connected)
- [ ] Reviews from verified buyers (so ratings can be shown honestly)
- [ ] Courier integration (e.g. Shiprocket) for automatic tracking updates
- [ ] Automated browser tests for sign-in, checkout and admin

### Client content

- [ ] Real products, prices, stock, photos and datasheets (enter them in `/admin`)
- [ ] Company story, founder bio and photo, real stats, school logos, project photos and builder names
- [ ] Logo files, social links, contact email/phone/address
- [ ] Shipping fees, GST treatment, return window, FAQ answers
- [ ] Privacy, terms, refund and shipping policies reviewed by a lawyer
- [ ] ATL package details and regions served (`/schools`)
- [ ] Sign-off on all draft copy; expert review of the technical articles

### Accounts and setup

- [ ] Cloudflare: D1 database, R2 bucket, Workers Paid plan, Pages project, domains, www → apex redirect
- [ ] Razorpay: KYC, test keys (verify the real payment window), live keys, webhook
- [ ] Resend: verify the sending domain
- [ ] MSG91: DLT registration, sender ID, OTP template
- [ ] Google: Search Console + sitemap, Analytics (GA4), Business Profile
- [ ] Admin emails and secret keys configured in Cloudflare

### After launch

- [ ] Links from colleges, hackathons and the ATL vendor directory
- [ ] Publish articles regularly (the two draft project write-ups first)
- [ ] Re-measure page speed on the live site

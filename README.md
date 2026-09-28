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

- **Frontend:** set `VITE_API_URL` to the API's public URL (see
  `.env.example`), then deploy `dist/` to Cloudflare Pages.
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

What the site uses the API for: sign-in (email/password or phone OTP),
checkout with Razorpay, order tracking, the account area (orders, addresses,
wishlist, profile), live stock, and every form (contact, workshop requests,
newsletter, project submissions, part requests). Product and article pages
are built from `src/content/*.js`, the same data used to seed the API.

## Before launch

Search the code for `TODO_CLIENT` to find every placeholder: real product data
and photos, the client's story, legal text, and service keys.

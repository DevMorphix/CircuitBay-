# CircuitBay API

Backend for the CircuitBay site and shop: catalog, checkout with Razorpay,
order tracking, accounts (email/password and phone OTP), blog/project
content, contact/workshop/newsletter forms, admin, and file uploads to
Cloudflare R2. Data lives in Cloudflare D1.

Built with [Hono](https://hono.dev) so the **same code** runs in two places:

| Entry | Runtime | Database | Files | Use for |
|---|---|---|---|---|
| `src/worker.js` | Cloudflare Workers | D1 binding | R2 binding | **Production (recommended)** |
| `src/node.js` | Node.js ≥ 22.5 | local SQLite *or* D1 via REST | local disk *or* R2 via S3 API | Local dev, or a Node host |

## Quick start (local, no accounts needed)

```bash
cd server
npm install
npm run db:seed:local   # migrate + load the site's draft catalog/articles/projects
npm run dev             # http://localhost:8787
npm test                # 42 integration tests
```

Then run the frontend (`npm run dev` in the repo root). Vite proxies `/api` and
`/media` to port 8787. By default, payments are **fake**: to complete a
checkout, send the signature `fake-ok`. Emails and OTP codes are printed to
the console.

To try the Worker locally with simulated D1/R2:

```bash
cp .dev.vars.example .dev.vars
npx wrangler d1 migrations apply circuitbay --local
npm run db:seed:build && npx wrangler d1 execute circuitbay --local --file seed/seed.sql
npm run dev:worker
```

## Deploying to Cloudflare

1. Create the database and bucket:

   ```bash
   npx wrangler login
   npx wrangler d1 create circuitbay         # paste database_id into wrangler.toml
   npx wrangler r2 bucket create circuitbay-media
   ```

2. Apply the schema, and optionally the seed data:

   ```bash
   npm run db:migrate:d1
   npm run db:seed:d1
   ```

3. Set secrets:

   ```bash
   npx wrangler secret put RAZORPAY_KEY_SECRET
   npx wrangler secret put RAZORPAY_WEBHOOK_SECRET
   npx wrangler secret put RESEND_API_KEY
   npx wrangler secret put MSG91_AUTH_KEY
   ```

4. Fill in the `[vars]` in `wrangler.toml` (`RAZORPAY_KEY_ID`, `ADMIN_EMAILS`,
   `MSG91_OTP_TEMPLATE_ID`, …).
5. Run `npm run deploy`, then add a custom domain such as `api.circuitbay.in`
   for the Worker.
6. **Razorpay Dashboard → Webhooks:** point
   `https://api.circuitbay.in/api/webhooks/razorpay` at the events
   `payment.captured`, `payment.failed` and `order.paid`, using the same
   webhook secret.
7. Optional: give the R2 bucket a public custom domain and set
   `MEDIA_PUBLIC_URL`. Otherwise files are served through `/media/*`.

### Running as a plain Node server against D1/R2

Set `DB_DRIVER=d1-http` and `STORAGE_DRIVER=r2` plus the Cloudflare
credentials (see `.env.example`). This works, but every query becomes an HTTPS
call to Cloudflare's REST API. That call is slower, counts against the
account-wide API rate limit, and batches are **not atomic** there. For real
traffic, deploy the Worker.

## Layout

```
migrations/           D1/SQLite schema (wrangler-compatible)
scripts/              local migrate + seed builder (reads ../src/content/*)
src/app.js            Hono app: middleware, routes, error handling
src/worker.js         Workers entry (+ daily cron housekeeping)
src/node.js           Node entry (picks adapters from env)
src/config.js         env validation (zod)
src/db/               d1 | d1-http | sqlite adapters (same interface)
src/storage/          r2-binding | r2-s3 | local-disk adapters
src/services/         email (Resend), sms (MSG91), payments (Razorpay), orders
src/middleware/       sessions/roles, rate limiting, validation
src/routes/           auth, catalog, content, forms, orders, webhooks, account, admin, media
test/                 vitest integration tests (in-memory SQLite)
```

## API overview

All bodies are JSON. Errors come back as
`{ "error": { "code", "message", "details?" } }`. Prices are returned in
rupees, with `pricePaise` alongside.

| Area | Endpoints |
|---|---|
| Health | `GET /api/health` |
| Auth | `POST /api/auth/register`, `/login`, `/logout`, `GET /api/auth/me`, `POST /api/auth/otp/request`, `/otp/verify`, `/password/forgot`, `/password/reset`, `/password/change`, `/email/verify`, `/email/resend` |
| Catalog | `GET /api/categories`, `GET /api/products?category=&q=&level=&brand=&type=&minPrice=&maxPrice=&inStock=&kit=&ids=&sort=&page=&limit=` (includes facets), `GET /api/products/:id` |
| Content | `GET /api/articles?category=&q=&featured=&page=`, `GET /api/articles/:slug`, `GET /api/projects` |
| Checkout | `POST /api/checkout/quote` (cart totals with a coupon), `POST /api/checkout` (optional `couponCode`) → Razorpay order, `POST /api/checkout/verify`, `POST /api/checkout/failed`, `POST /api/webhooks/razorpay` |
| Orders | `GET /api/orders/track?orderId=&contact=` (guest), `GET /api/me/orders`, `GET /api/me/orders/:id` |
| Account | `PATCH /api/me/profile`, `GET/POST/PUT/DELETE /api/me/addresses[/:id]`, `GET /api/me/wishlist`, `PUT/DELETE /api/me/wishlist/:productId` |
| Forms | `POST /api/forms/contact`, `/workshop-requests`, `/newsletter`, `/newsletter/unsubscribe`, `/newsletter/one-click` (RFC 8058, mail apps), `/project-submissions` |
| Admin | `GET /api/admin/stats`; products CRUD + stock; `PUT /api/admin/categories/:slug`; orders list/detail + `POST /orders/:id/status`; coupons list/create/edit (`/api/admin/coupons`); inbox lists; project moderation; articles CRUD; `POST /api/admin/uploads` (multipart) |
| Media | `GET /media/<key>` |

### Checkout flow (frontend)

1. `POST /api/checkout` with the cart, contact and address. The response
   contains `payment` (`key`, `orderId`, `amount`, `prefill`).
2. Open Razorpay Checkout.js with those values.
3. In the `handler`, send `POST /api/checkout/verify` with `orderId` and the
   three `razorpay_*` fields. The order becomes `placed` and the
   confirmation email goes out.
4. On dismiss or failure, send `POST /api/checkout/failed`. The webhook also
   covers both outcomes if the browser never reports back.

## Capacity (10,000 simultaneous users)

How the design handles load:

- **Static site on the CDN.** The frontend is plain files served from
  Cloudflare's edge, which absorbs any number of visitors. Story-reel frames
  were re-encoded to WebP (7.4 MB → 0.9 MB per visitor), and pages are
  code-split (main bundle 78 KB gzipped).
- **The API auto-scales.** Workers run in every Cloudflare location, with no
  servers to size.
- **Reads are cached.** Catalog, blog and project GETs are cached at the edge
  (60–300 s) and in browsers, so 10k people browsing the same pages cost D1
  roughly one query per page per TTL per location. These requests also skip
  the session lookup. Admin edits clear the cache (on Workers they appear
  within one TTL).
- **Writes are small and indexed.** Checkout, sign-in and forms are
  single-row inserts or primary-key updates. Rate limits live in the
  database, so they hold across all instances.
- **Stock can't oversell.** Checkout reserves stock atomically; the
  `stock >= 0` CHECK constraint rejects the whole order if any line would go
  negative. Unpaid holds are released after 30 minutes by the 10-minute cron.
  A late payment re-reserves the stock, or is flagged for refund if it's gone
  (`refundsNeeded` in `/api/admin/stats`). Tested: 10 simultaneous buyers for
  4 units → exactly 4 orders.

Measured locally (one Node process on a laptop, SQLite, cached endpoint,
`autocannon`):

| Scenario | Throughput | Latency | Errors |
|---|---|---|---|
| 1,000 connections, no pause | ~8,700 req/s | p50 109 ms, p99 226 ms | 0 |
| 10,000 connections at a realistic 2,000 req/s (≈ 1 click / 5 s each) | 2,000 req/s | p50 79 ms | 0 |
| 10,000 connections, no pause (overload test) | ~8,000 req/s | p50 1.1 s | 0 |

On Workers, the load spreads across Cloudflare's network instead of one
process. The remaining shared resource is D1: a single database handles
writes one at a time. That's comfortably enough for a shop's checkout and
sign-in rate, and caching keeps reads off it.

**Production requirements for this scale:**

- **Workers Paid plan** ($5/month). The free plan's 10 ms CPU limit is too
  low for password hashing, and its daily request cap is 100k.
- Serve the API on a **custom domain**. The edge cache doesn't run on
  `*.workers.dev`.
- Optional, for heavy read traffic beyond the cache: enable
  [D1 read replication](https://developers.cloudflare.com/d1/best-practices/read-replication/).
- Run a load test against the deployed staging Worker before a big launch or
  sale (for example `npx autocannon -c 2000 -R 2000 https://staging-api…/api/products`).
  Local numbers don't guarantee production numbers.

## Security notes

- Passwords are hashed with PBKDF2-SHA256 (100k iterations, the maximum
  Workers allows).
- Sessions are opaque random tokens in an `HttpOnly`, `SameSite=Lax` cookie;
  only their SHA-256 is stored.
- CSRF protection: writes must be JSON and come from an allowed `Origin`.
- OTPs are hashed, single-use, expire after 10 minutes, and lock after 5 wrong
  tries. Requests are limited per phone and per IP.
- Rate limits are stored in the database, so they apply across all instances.
- Prices and stock are always recomputed on the server. Payment signatures and
  webhooks are verified with HMAC, and webhooks are idempotent.
- Uploads are admin-only, checked against a type allowlist, capped at 10 MB,
  and stored under random keys.

## TODO before launch

- Set `database_id` in `wrangler.toml`, and add the real secrets and domains.
- Confirm shipping fees, the free-shipping threshold and GST treatment in
  `src/lib/money.js`.
- Register the MSG91 DLT template and verify its variable name in
  `src/services/sms.js`.
- Verify the sending domain in Resend. Optionally create a Resend audience
  and set `RESEND_AUDIENCE_ID` (a `[vars]` entry) so newsletter sign-ups and
  unsubscribes stay in sync with it for broadcasts.

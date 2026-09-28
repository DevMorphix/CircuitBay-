# CircuitBay

Website, blog and shop for CircuitBay (**Create. Break. Learn.**), with its API.

```
circuitbay-landing/
├── src/            React 19 + Vite + Tailwind v4 frontend (all pages in full-project.md)
├── public/         static assets (story-reel frames are WebP, ~23 KB each)
├── server/         API: Hono on Cloudflare Workers + D1 (database) + R2 (files)
├── full-project.md page-by-page layout & copy spec
├── BUILD_NOTES.md  how the frontend is put together
└── CONTENT_CHECKLIST.md  what still needs real client content
```

## Run it locally

```bash
# frontend  → http://localhost:5173
npm install
npm run dev

# API       → http://localhost:8787   (Vite proxies /api and /media to it)
cd server
npm install
npm run db:seed:local
npm run dev
```

`npm run build` makes a production build in `dist/`: every public page is
prerendered to HTML with its own title, description, canonical and
structured data, plus `sitemap.xml`, `404.html` and Cloudflare Pages routing.
The build fails if any page breaks the SEO checks (see `BUILD_NOTES.md`).
Deploy `dist/` to Cloudflare Pages. `npm run lint` checks the code; the API
has its own tests (`cd server && npm test`).

## Architecture

```
 Browser ──► Cloudflare CDN ──► static site (dist/)            cached at the edge
    │
    └──────► api.circuitbay.in  (Cloudflare Worker, auto-scales)
               │  edge cache ◄── public reads (catalog, blog, projects)
               ├─ D1  (SQLite)   users, orders, products, content…
               ├─ R2  (files)    product photos, datasheets, uploads
               ├─ Razorpay       payments + signed webhooks
               ├─ Resend         email       └─ MSG91  SMS OTP
               └─ Cron (10 min)  release unpaid stock holds, cleanup
```

See `server/README.md` for the API, deployment and the capacity notes.

## Before launch

Search for `TODO_CLIENT` to find every placeholder, and work through
`CONTENT_CHECKLIST.md`. The frontend still uses the mock data in
`src/content/*.js`; connecting it to the API is the next step.

# Build notes

## Story reel: scroll-synced 40-frame sequence across five sections

The site opens with `StoryReel` (`src/components/sections/StoryReel.jsx`),
which replaces the old single-section video hero. It's a 40-frame WebP
sequence — the same shot supplied at the project root, showing an Arduino
Uno / ESP32 / ultrasonic sensor kit packing into a Circuit Bay box, shipping
out, and getting handed off at the door — drawn frame-by-frame onto a
`<canvas>` rather than played as a video. Frames live in
`public/hero/frames/frame_001.webp` … `frame_040.webp` (WebP q90, ~23 KB each).

It's one scroll track, not five separate hero sections: the reel is a
single `520vh`-tall element with a `position: sticky` viewport pinned
inside it (`h-[100svh]`), and **both** the canvas frame *and* which
chapter's copy is on screen are driven off the exact same
`framer-motion` `scrollYProgress` value (`useScroll` with `target` set to
the tall track). One number drives two things, so the copy is never just
"near" the right shot — `frameIndex = round(progress * 39)` and the active
chapter's opacity window are computed from the same input every scroll
tick. Chapter → frame-range mapping lives in `siteContent.js` under
`story.chapters`, picked by eye against the source frames: components
float through ~frame 9, the branded box holds ~9–19, the van is in transit
~19–29, and it's parked outside / handing off the box ~29–40.

Each of the five chapters (hero, gap, turn, ship, delivered — pulling their
copy straight from the existing `spark`/`gap`/`turn` content plus two new
`ship`/`delivered` entries) cross-fades in over the same pinned canvas via
`opacity`/`y` transforms. A chapter **unmounts itself** (returns `null`)
once scroll progress is more than a chapter-width outside its own window,
rather than just sitting at `opacity: 0` — with five of these stacked at
the same absolute position for the whole 520vh scroll range, keeping a
"finished" chapter's DOM (and its CTA buttons) around indefinitely was
both wasteful and, on fast/synthetic scroll jumps, could let its opacity
transform land on a stale value while a different chapter had already
taken over interaction. Unmounting outside a generous buffer window makes
that class of bug structurally impossible rather than tuning around it.
The chapter currently "in range" also gets `inert={false}`, `aria-hidden=
{false}`; every other mounted-but-fading chapter is `inert` so its buttons
can't be focused or clicked while invisible (React 19's `inert` prop).

Frames preload progressively via `useFramePreloader`: frame 1 is awaited
before the reel paints (so there's no blank flash on load), the rest
stream in behind it, and a scrub that outruns the network just holds on
the nearest already-decoded frame instead of showing nothing.

`prefers-reduced-motion` skips the pinning/canvas entirely and renders
`ReducedMotionStory` — the same five chapters stacked as normal
non-scrubbing sections, each with its own representative static frame
image.

To swap in a new shot: drop a same-length (or re-numbered) frame sequence
into `public/hero/frames/`, update `story.frameCount` in
`siteContent.js` if the count changes, and re-tune each chapter's
`progress` range in `story.chapters` against the new footage's beats.

## Site structure and shared theme

Every page follows `full-project.md` and pulls its colours from one place:

- **Tokens** (`src/index.css` `@theme`): brand blue `#3F7DDE` scale, navy
  (`navy-800/900/950`) for dark sections, `surface-soft` / `surface-grey`
  for light ones. Shared classes: `.section-light|soft|grey|dark`, `.card` +
  `.card-hover` (lift + blue circuit-trace glow), `.card-dark`, `.eyebrow`,
  `.field`, `.chip`, `.node-lit`, `.photo-placeholder`.
- **Primitives** (`src/components/ui/`): `Section` / `PageHero` (every
  section goes through these — pick a `tone` and alternate dark/light),
  `Card`, `ArrowLink` / `ArrowText`, `Photo`, `Icon` (one line-icon set),
  `Button` (`to` = router link; variants primary / secondary /
  secondary-dark / dark).
- **Layout**: `PageShell` wraps every route with `Header` (main site) or
  `ShopHeader` (announcement bar, search, cart, categories, sticky mobile
  cart) plus the navy `Footer`.
- **Content**: `siteContent.js` (home/about/contact/footer copy),
  `blogData.js`, `shopData.js` (mock catalog, FAQ, payment methods).
- **Cart**: `CartContext` — front-end only, persisted to localStorage.
  Checkout simulates payment (TODO_CLIENT: real gateway).

Routes: `/`, `/blog`, `/blog/:slug`, `/shop`, `/shop/category/:slug`
(`all?q=` = search), `/shop/product/:id`, `/shop/cart`, `/shop/checkout`,
`/shop/order/:id`, `/shop/track`, `/account`, `/faq`, `/about`,
`/contact` (`#workshop` form), `/projects` (`#submit`), and the legal pages.

## SEO: prerendering, per-page head, structured data

`npm run build` runs three steps: `vite build`, an SSR build of
`src/entry-server.jsx`, then `scripts/prerender.js`. The result is a real
HTML file for every public page (`dist/about.html`,
`dist/shop/product/<id>.html`, …), so crawlers and link previews see full
content and the right `<head>` without running JavaScript. In the browser,
`main.jsx` hydrates that HTML.

- **Per-page head:** every page passes `seo={{ title, description, path,
  jsonLd, noindex }}` to `PageShell`. `<Seo>` (`components/seo/Seo.jsx`)
  records it at build time and keeps `<head>` in sync on client-side
  navigation. Tag building and schema helpers live in `lib/seo.js`
  (canonical host `https://circuitbay.in`).
- **Structured data:** Organization + WebSite (home), Product + Offer,
  Article/TechArticle, BreadcrumbList, FAQPage, Service and ItemList.
  Ratings are intentionally not marked up until real reviews exist.
- **Adding a page:** add the route in `App.jsx`, give it a `seo` prop, and
  list it in `indexableRoutes` (`entry-server.jsx`). Private pages go in
  `shellRoutes` instead (served from `app-shell.html` with `noindex`).
- **Build-time checks:** the prerender step fails the build if any page has a
  missing or duplicate title, a title over 65 characters, a description over
  160, anything other than one `<h1>`, or a missing canonical.
- **Hosting (Cloudflare Pages):** `dist/_redirects` rewrites private routes
  to the app shell, `404.html` gives real 404s, `_headers` sets caching,
  and `sitemap.xml` is generated from the same route list.
- **Hydration safety:** browser-only state (cart, cookie consent, reduced
  motion) renders its server version first (`lib/hydration.js`).
  Prerendered content appears immediately; `Reveal` animations only run on
  pages reached by client-side navigation.

## Section-to-section scroll snap

Home page only: `Home.jsx` adds `home-snap` to `<html>`, which sets
`scroll-snap-type: y proximity`; home sections pass `snap` to `Section`.
"Proximity", not "mandatory", because the 520vh story reel above them does
its own free-scrubbing scroll. Disabled under `prefers-reduced-motion`.

## What's placeholder vs. real

See `CONTENT_CHECKLIST.md` for the full list mapped to the client's brief.
Search the codebase for `TODO_CLIENT` to find every spot a real asset,
number, or piece of approved copy still needs to replace a placeholder.

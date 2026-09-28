// Build step 3 of 3 (after `vite build` and the SSR build): writes a real
// HTML file for every public page, plus 404.html, the app shell, the
// sitemap and Cloudflare Pages routing rules. Then sanity-checks every page's
// SEO basics so a regression fails the build.
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const dist = join(root, 'dist')
const ssrDir = join(root, 'dist-ssr')

const { render, indexableRoutes, shellRoutes, SITE } = await import(pathToFileURL(join(ssrDir, 'entry-server.js')).href)

// Inline the (single, ~9 KB gzipped) stylesheet so first paint doesn't wait
// for a render-blocking CSS request — the biggest LCP win on mobile.
const template = readFileSync(join(dist, 'index.html'), 'utf8').replace(
  /<link rel="stylesheet"[^>]*href="(\/assets\/[^"]+\.css)"[^>]*>/,
  (_, href) => `<style>${readFileSync(join(dist, href.slice(1)), 'utf8')}</style>`,
)
const HEAD_SLOT = /<!--seo-head-->[\s\S]*?<!--\/seo-head-->/
if (!HEAD_SLOT.test(template) || !template.includes('<div id="root"></div>')) {
  throw new Error('index.html is missing the <!--seo-head--> slot or <div id="root"></div>')
}

const page = (head, html) => template.replace(HEAD_SLOT, head).replace('<div id="root"></div>', `<div id="root">${html}</div>`)

// "/" → index.html, "/about" → about.html, "/blog/x" → blog/x.html
// (Cloudflare Pages serves /about from about.html without a trailing slash)
const fileFor = (path) => join(dist, path === '/' ? 'index.html' : `${path.slice(1)}.html`)

function write(file, html) {
  mkdirSync(dirname(file), { recursive: true })
  writeFileSync(file, html)
}

// ---- checks ----
const problems = []
const count = (html, re) => (html.match(re) ?? []).length
function check(path, head, html) {
  const title = head.match(/<title data-seo>([^<]*)<\/title>/)?.[1] ?? ''
  const desc = head.match(/<meta data-seo name="description" content="([^"]*)"/)?.[1] ?? ''
  const unescape = (s) => s.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  const row = { path, titleLen: unescape(title).length, descLen: unescape(desc).length, h1: count(html, /<h1[\s>]/g), canonical: count(head, /rel="canonical"/g), jsonLd: count(head, /application\/ld\+json/g), words: html.replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length }
  if (!title) problems.push(`${path}: missing <title>`)
  if (row.titleLen > 65) problems.push(`${path}: title ${row.titleLen} chars (keep ≤ 65)`)
  if (!desc) problems.push(`${path}: missing meta description`)
  if (row.descLen > 160) problems.push(`${path}: description ${row.descLen} chars (keep ≤ 160)`)
  if (row.h1 !== 1) problems.push(`${path}: ${row.h1} <h1> elements (want exactly 1)`)
  if (row.canonical !== 1) problems.push(`${path}: ${row.canonical} canonical tags (want 1)`)
  return row
}

// ---- indexable pages ----
const rows = []
const titles = new Map()
for (const route of indexableRoutes) {
  const { html, head, noindex } = await render(route.path)
  if (noindex) problems.push(`${route.path}: listed as indexable but renders noindex`)
  const row = check(route.path, head, html)
  const t = head.match(/<title data-seo>([^<]*)</)?.[1]
  if (titles.has(t)) problems.push(`${route.path}: duplicate title with ${titles.get(t)}`)
  titles.set(t, route.path)
  rows.push(row)
  write(fileFor(route.path), page(head, html))
}

// ---- 404 page (Cloudflare Pages serves it with HTTP 404 for unknown URLs) ----
{
  const { html, head } = await render('/__not-found__')
  write(join(dist, '404.html'), page(head, html))
}

// ---- app shell for private/per-visitor routes (rendered client-side) ----
write(
  join(dist, 'app-shell.html'),
  template.replace(HEAD_SLOT, `<title>${SITE.name}</title>\n    <meta name="robots" content="noindex, follow" />`),
)
writeFileSync(
  join(dist, '_redirects'),
  [
    '# Private routes render in the browser from the app shell (HTTP 200)',
    ...shellRoutes.map((r) => `${r}  /app-shell  200`),
    '',
  ].join('\n'),
)

// ---- sitemap ----
const sitemap = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  ...indexableRoutes.map(
    (r) =>
      `  <url><loc>${SITE.url}${r.path === '/' ? '/' : r.path}</loc><lastmod>${r.lastmod}</lastmod><changefreq>${r.changefreq}</changefreq><priority>${r.priority.toFixed(1)}</priority></url>`,
  ),
  '</urlset>',
  '',
].join('\n')
writeFileSync(join(dist, 'sitemap.xml'), sitemap)

rmSync(ssrDir, { recursive: true, force: true })

// ---- report ----
console.log(`\nPrerendered ${rows.length} pages + 404.html + app-shell.html; sitemap has ${indexableRoutes.length} URLs\n`)
console.table(rows)
if (problems.length) {
  console.error(`\nSEO checks failed:\n  - ${problems.join('\n  - ')}`)
  process.exit(1)
}
console.log('SEO checks passed: unique titles ≤65 chars, descriptions ≤160, one H1, one canonical per page.')

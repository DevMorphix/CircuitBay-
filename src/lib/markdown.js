// Markdown for articles. Articles are stored as blocks (what the site
// renders, prerenders and checks for SEO); the admin editor lets the team
// write Markdown and converts both ways. Supported:
//
//   ## Section heading            (also # / ###; all become sections in the contents list)
//   ## Heading {#anchor}          fixed link anchor (otherwise made from the text)
//   Paragraph text, with **bold**, *italic*, `code` and [links](https://…)
//   - bullet item / * bullet item
//   1. numbered item
//   | Head | Head |  +  |---|---|  +  | cell | cell |
//   ```lang  …code…  ```
//   ![Caption](https://…image)     image with caption
//   ![Caption]()                    diagram placeholder (no image yet)
//
// Pure functions, no DOM: used by the admin editor and the API tests.

const slugify = (s) =>
  s
    .toLowerCase()
    .replace(/[*_`[\]()]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 80)

const HEADING = /^#{1,6}\s+(.*)$/
const BULLET = /^\s*[-*+]\s+(.*)$/
const NUMBERED = /^\s*\d+[.)]\s+(.*)$/
const FENCE = /^\s*(```|~~~)/
const IMAGE = /^!\[([^\]]*)\]\(\s*([^)\s]*)\s*\)\s*$/
const TABLE_ROW = /^\s*\|.*\|\s*$/
const TABLE_SEP = /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/

const cells = (line) =>
  line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((c) => c.trim())

export function markdownToBlocks(md) {
  const lines = String(md ?? '').replace(/\r\n?/g, '\n').split('\n')
  const blocks = []
  let para = []
  const flush = () => {
    if (para.length) blocks.push({ type: 'p', text: para.join(' ') })
    para = []
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const trimmed = line.trim()

    if (FENCE.test(line)) {
      flush()
      const fence = line.trim().slice(0, 3)
      const code = []
      i++
      while (i < lines.length && !lines[i].trim().startsWith(fence)) code.push(lines[i++])
      blocks.push({ type: 'code', text: code.join('\n') })
      continue
    }
    if (!trimmed) {
      flush()
      continue
    }
    let m
    if ((m = trimmed.match(HEADING))) {
      flush()
      // Optional fixed anchor: "## Wiring it up {#wiring}"
      const anchor = m[1].match(/\s*\{#([a-z0-9-]{1,80})\}\s*$/)
      const text = (anchor ? m[1].slice(0, anchor.index) : m[1]).replace(/\s+#+\s*$/, '').trim()
      blocks.push({ type: 'h2', id: anchor ? anchor[1] : slugify(text), text })
      continue
    }
    if ((m = trimmed.match(IMAGE))) {
      flush()
      blocks.push(m[2] ? { type: 'image', text: m[1].trim(), src: m[2] } : { type: 'diagram', text: m[1].trim() })
      continue
    }
    if (BULLET.test(line) || NUMBERED.test(line)) {
      flush()
      const ordered = !BULLET.test(line)
      const re = ordered ? NUMBERED : BULLET
      const items = []
      while (i < lines.length && re.test(lines[i])) {
        let item = lines[i].match(re)[1].trim()
        // Indented follow-on lines continue the item
        while (i + 1 < lines.length && /^\s{2,}\S/.test(lines[i + 1]) && !BULLET.test(lines[i + 1]) && !NUMBERED.test(lines[i + 1])) {
          item += ` ${lines[++i].trim()}`
        }
        items.push(item)
        i++
      }
      i--
      blocks.push(ordered ? { type: 'list', ordered: true, items } : { type: 'list', items })
      continue
    }
    if (TABLE_ROW.test(line) && i + 1 < lines.length && TABLE_SEP.test(lines[i + 1])) {
      flush()
      const head = cells(line)
      const rows = []
      i += 2
      while (i < lines.length && TABLE_ROW.test(lines[i])) rows.push(cells(lines[i++]).slice(0, head.length))
      i--
      blocks.push({ type: 'table', head, rows })
      continue
    }
    para.push(trimmed)
  }
  flush()
  return blocks
}

const escCell = (s) => String(s).replace(/\|/g, '\\|')

export function blocksToMarkdown(blocks = []) {
  return blocks
    .map((b) => {
      switch (b.type) {
        case 'h2':
          // Keep an existing anchor so links to it don't break
          return b.id && b.id !== slugify(b.text) ? `## ${b.text} {#${b.id}}` : `## ${b.text}`
        case 'code':
          return `\`\`\`\n${b.text}\n\`\`\``
        case 'list':
          return b.items.map((item, n) => (b.ordered ? `${n + 1}. ${item}` : `- ${item}`)).join('\n')
        case 'table':
          return [
            `| ${b.head.map(escCell).join(' | ')} |`,
            `| ${b.head.map(() => '---').join(' | ')} |`,
            ...b.rows.map((r) => `| ${r.map(escCell).join(' | ')} |`),
          ].join('\n')
        case 'diagram':
          return `![${b.text}]()`
        case 'image':
          return `![${b.text ?? ''}](${b.src ?? ''})`
        default:
          return b.text
      }
    })
    .join('\n\n')
}

// Links: web, email, and on-site paths only (never javascript: etc.)
export const safeHref = (url) => (/^(https?:\/\/|mailto:|\/(?!\/)|#)/i.test(url) ? url : null)

// Inline Markdown → tokens: { type: 'text' | 'strong' | 'em' | 'code', text }
// and { type: 'link', text, href }. Unsafe links become plain text.
// Underscore styles only count at word edges, so names like DHT_PIN or
// WIFI_SSID stay as typed.
const INLINE = /(`[^`]+`)|(\*\*[^*]+\*\*|(?<![\w])__[^_]+__(?![\w]))|(\*[^*\s][^*]*\*|(?<![\w])_[^_\s][^_]*_(?![\w]))|(\[[^\]]+\]\([^)\s]+\))/g

export function parseInline(text) {
  const out = []
  let last = 0
  const src = String(text ?? '')
  for (const m of src.matchAll(INLINE)) {
    if (m.index > last) out.push({ type: 'text', text: src.slice(last, m.index) })
    const [tok] = m
    if (m[1]) out.push({ type: 'code', text: tok.slice(1, -1) })
    else if (m[2]) out.push({ type: 'strong', text: tok.slice(2, -2) })
    else if (m[3]) out.push({ type: 'em', text: tok.slice(1, -1) })
    else {
      const [, label, url] = tok.match(/^\[([^\]]+)\]\(([^)\s]+)\)$/)
      const href = safeHref(url)
      out.push(href ? { type: 'link', text: label, href } : { type: 'text', text: label })
    }
    last = m.index + tok.length
  }
  if (last < src.length) out.push({ type: 'text', text: src.slice(last) })
  return out
}

// Plain text with inline Markdown removed (headings, search, word counts)
export const stripInline = (text) =>
  parseInline(text)
    .map((t) => t.text)
    .join('')

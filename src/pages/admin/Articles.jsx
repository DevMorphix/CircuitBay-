import { useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { blogCategories } from '../../content/blogData.js'
import { api, fieldErrors } from '../../lib/api.js'
import { useApi } from '../../lib/useApi.js'
import { blocksToMarkdown, markdownToBlocks } from '../../lib/markdown.js'
import { ArticleBody } from '../../components/content/ArticleBody.jsx'
import { dateTime, mediaUrl, btn, slugify } from './format.js'
import { Empty, Field, LoadState, PageTitle, Panel, Pill, Uploader } from './ui.jsx'
const csv = (s) => s.split(',').map((x) => x.trim()).filter(Boolean)

// ---------------------------------------------------------------- list --
export function Articles() {
  const { data, error, loading } = useApi('/admin/articles')
  return (
    <>
      <PageTitle title="Articles" subtitle="Blog posts, including drafts." action={<Link to="/admin/articles/new" className={btn.primary}>+ New article</Link>} />
      <Panel>
        <LoadState loading={loading} error={error}>
          {data?.articles.length === 0 ? (
            <Empty>No articles yet.</Empty>
          ) : (
            <ul className="divide-y divide-black/5">
              {data?.articles.map((a) => (
                <li key={a.slug} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div>
                    <Link to={`/admin/articles/${a.slug}`} className="font-semibold text-brand-700 hover:underline">{a.title}</Link>
                    <p className="text-xs text-ink-400">/blog/{a.slug}{a.date ? ` · ${a.date}` : ''}</p>
                  </div>
                  <div className="flex gap-2">
                    {a.featured && <Pill tone="new">Featured</Pill>}
                    <Pill tone={a.status === 'published' ? 'active' : 'muted'}>{a.status}</Pill>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </LoadState>
      </Panel>
    </>
  )
}

// -------------------------------------------------------------- editor --
export function ArticleEditor() {
  const { slug } = useParams()
  const { data, error, loading } = useApi(slug ? `/admin/articles/${slug}` : null)
  return (
    <>
      <PageTitle title={slug ? 'Edit article' : 'New article'} action={<Link to="/admin/articles" className={btn.link}>← All articles</Link>} />
      <LoadState loading={loading} error={error}>
        {(!slug || data) && <ArticleForm article={data?.article} />}
      </LoadState>
    </>
  )
}

function ArticleForm({ article }) {
  const navigate = useNavigate()
  const isNew = !article
  const [markdown, setMarkdown] = useState(() => blocksToMarkdown(article?.body ?? []))
  const [coverKey, setCoverKey] = useState(article?.coverKey ?? null)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState({ error: '', fields: {}, saved: '' })

  const submit = async (e) => {
    e.preventDefault()
    const d = Object.fromEntries(new FormData(e.currentTarget))
    const slug = article?.slug ?? slugify(d.slug || d.title)
    const payload = {
      title: d.title,
      seoTitle: d.seoTitle || undefined,
      category: d.category,
      excerpt: d.excerpt || undefined,
      body: markdownToBlocks(markdown),
      readTime: d.readTime ? Number(d.readTime) : undefined,
      author: d.author || undefined,
      coverKey,
      featured: d.featured === 'on',
      parts: csv(d.parts ?? ''),
      relatedProjects: csv(d.relatedProjects ?? ''),
      status: d.status,
    }
    setBusy(true)
    setMsg({ error: '', fields: {}, saved: '' })
    try {
      await api.put(`/admin/articles/${slug}`, payload)
      setMsg({ error: '', fields: {}, saved: payload.status === 'published' ? 'Saved as published — click “Publish site changes” to put it on the blog.' : 'Draft saved.' })
      if (isNew) navigate(`/admin/articles/${slug}`, { replace: true })
    } catch (err) {
      setMsg({ error: err.message, fields: fieldErrors(err), saved: '' })
    } finally {
      setBusy(false)
    }
  }

  const remove = async () => {
    if (!window.confirm(`Delete "${article.title}" permanently?`)) return
    await api.del(`/admin/articles/${article.slug}`)
    navigate('/admin/articles')
  }

  return (
    <form onSubmit={submit} className="grid gap-5 xl:grid-cols-[1.6fr_1fr]">
      <div className="grid content-start gap-5">
        <Panel title="Article">
          <div className="grid gap-4">
            <Field label="Title (the headline on the page)" id="a-title" name="title" required defaultValue={article?.title} error={msg.fields.title} />
            <Field label="Search title (optional, ≤ 52 characters)" id="a-seo" name="seoTitle" maxLength={52} defaultValue={article?.seoTitle ?? ''} hint="Shown in Google and browser tabs, followed by ' | CircuitBay'. Leave empty to use the headline." error={msg.fields.seoTitle} />
            {isNew && <Field label="URL slug (optional)" id="a-slug" name="slug" placeholder="made from the title if empty" hint="/blog/<slug> — can't be changed after the first save." />}
            <Field as="textarea" rows={2} label="Excerpt (search snippet + card text, ≤ 160 characters works best)" id="a-excerpt" name="excerpt" maxLength={400} defaultValue={article?.excerpt ?? ''} />
          </div>
        </Panel>

        <MarkdownEditor value={markdown} onChange={setMarkdown} error={msg.fields.body} />
      </div>

      <div className="grid content-start gap-5">
        <Panel title="Publishing">
          <div className="grid gap-4">
            <Field label="Status" id="a-status">
              <select id="a-status" name="status" className="field" defaultValue={article?.status ?? 'draft'}>
                <option value="draft">Draft (hidden)</option>
                <option value="published">Published</option>
              </select>
            </Field>
            {article?.publishedAt && <p className="text-xs text-ink-400">First published {dateTime(article.publishedAt)}</p>}
            <Field label="Category" id="a-cat">
              <select id="a-cat" name="category" className="field" defaultValue={article?.category ?? blogCategories[0].slug}>
                {blogCategories.map((c) => (
                  <option key={c.slug} value={c.slug}>{c.label}</option>
                ))}
              </select>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Author" id="a-author" name="author" defaultValue={article?.author ?? ''} />
              <Field label="Read time (min)" id="a-read" name="readTime" type="number" min="1" max="120" defaultValue={article?.readTime ?? ''} />
            </div>
            <label className="flex items-center gap-2 text-sm text-ink-900">
              <input type="checkbox" name="featured" defaultChecked={article?.featured} className="h-4 w-4 accent-brand-600" /> Feature on the blog home
            </label>
          </div>
        </Panel>

        <Panel title="Cover image" action={<Uploader folder="articles" label={coverKey ? 'Replace' : 'Upload'} onUploaded={(u) => setCoverKey(u[0].key)} />}>
          {coverKey ? <img src={mediaUrl(coverKey)} alt="" className="aspect-[16/9] w-full rounded-lg object-cover" /> : <p className="text-sm text-ink-600">None yet.</p>}
        </Panel>

        <Panel title="Links">
          <div className="grid gap-4">
            <Field label="Parts used (product ids, comma-separated)" id="a-parts" name="parts" defaultValue={(article?.parts ?? []).join(', ')} placeholder="esp32-devkit, dht11" hint="Shown as a 'Parts used' box linking to the shop." />
            <Field label="Related projects (ids, comma-separated)" id="a-rel" name="relatedProjects" defaultValue={(article?.relatedProjects ?? []).join(', ')} />
          </div>
        </Panel>

        <div className="card sticky bottom-4 grid gap-3 p-4">
          {msg.error && <p role="alert" className="text-sm font-medium text-navy-800">{msg.error}</p>}
          {msg.saved && <p role="status" className="text-sm font-medium text-brand-700">{msg.saved}</p>}
          <div className="flex flex-wrap gap-3">
            <button type="submit" disabled={busy} className={btn.primary}>{busy ? 'Saving…' : 'Save'}</button>
            {!isNew && <button type="button" onClick={remove} className={btn.danger}>Delete</button>}
          </div>
        </div>
      </div>
    </form>
  )
}

// ------------------------------------------------------ markdown editor --
const HELP = [
  ['## Heading', 'Section heading (listed in "On this page")'],
  ['**bold**  *italic*  `code`', 'Inline styles'],
  ['[text](https://…)  [text](/shop)', 'Links (site paths or web addresses)'],
  ['- item   /   1. item', 'Bullet or numbered list'],
  ['| A | B |\n|---|---|\n| 1 | 2 |', 'Table (first column is the row label)'],
  ['```\ncode\n```', 'Code block'],
  ['![Caption](https://…)', 'Image with caption (use Upload image)'],
  ['![Caption]()', 'Diagram placeholder, no image yet'],
]

// [button label, title, [editor action, …args]]
const TOOLS = [
  ['H2', 'Heading', ['lines', '##', 'Heading']],
  ['B', 'Bold', ['wrap', '**', 'bold text']],
  ['I', 'Italic', ['wrap', '*', 'italic text']],
  ['</>', 'Inline code', ['wrap', '`', 'code']],
  ['Link', 'Link', ['link']],
  ['• List', 'Bullet list', ['lines', '-', 'Item']],
  ['1. List', 'Numbered list', ['lines', '1.', 'Step']],
  ['Table', 'Table', ['block', '| Column | Column |\n| --- | --- |\n| Row | Value |', 2, 8]],
  ['Code', 'Code block', ['block', '```\ncode here\n```', 4, 13]],
  ['Diagram', 'Diagram placeholder', ['block', '![Diagram caption]()', 2, 17]],
]

function MarkdownEditor({ value, onChange, error }) {
  const ref = useRef(null)
  const [tab, setTab] = useState('write')
  const blocks = tab === 'preview' ? markdownToBlocks(value) : null
  const words = value.trim() ? value.trim().split(/\s+/).length : 0

  // Replace the selection (or insert at the cursor), then restore focus
  // and select the part the author will want to type over
  const edit = (fn) => {
    const el = ref.current
    const { selectionStart: a, selectionEnd: b } = el
    const { text, select = [0, 0] } = fn(value.slice(a, b), value.slice(0, a))
    onChange(value.slice(0, a) + text + value.slice(b))
    requestAnimationFrame(() => {
      el.focus()
      el.setSelectionRange(a + select[0], a + select[1])
    })
  }
  const wrap = (mark, placeholder) => () =>
    edit((sel) => {
      const inner = sel || placeholder
      return { text: `${mark}${inner}${mark}`, select: [mark.length, mark.length + inner.length] }
    })
  // Starts every selected line with `prefix` ('1.' numbers them)
  const lines = (prefix, placeholder) => () =>
    edit((sel, before) => {
      const lead = before && !before.endsWith('\n') ? '\n' : ''
      const body = (sel || placeholder)
        .split('\n')
        .map((l, i) => `${prefix === '1.' ? `${i + 1}.` : prefix} ${l.replace(/^(#{1,6}|[-*+]|\d+[.)])\s+/, '')}`)
        .join('\n')
      return { text: lead + body, select: [lead.length, lead.length + body.length] }
    })
  // Inserts a block on its own, separated by a blank line
  const block = (snippet, from = 0, to = 0) => () =>
    edit((sel, before) => {
      const lead = !before || before.endsWith('\n\n') ? '' : before.endsWith('\n') ? '\n' : '\n\n'
      return { text: `${lead}${snippet}\n`, select: [lead.length + from, lead.length + to] }
    })
  const link = () =>
    edit((sel) => {
      const label = sel || 'link text'
      return { text: `[${label}](https://)`, select: [label.length + 3, label.length + 11] }
    })
  const insertImage = (uploaded) => block(`![Describe the image](${mediaUrl(uploaded[0].key)})`, 2, 22)()

  const actions = { lines, wrap, block, link: () => link }
  const run = ([kind, ...args]) => actions[kind](...args)()

  return (
    <Panel
      title="Body (Markdown)"
      action={
        <div role="tablist" aria-label="Editor view" className="flex rounded-xl bg-surface-soft p-1 text-sm font-semibold">
          {['write', 'preview'].map((t) => (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={tab === t}
              onClick={() => setTab(t)}
              className={`rounded-lg px-3 py-1 capitalize ${tab === t ? 'bg-white text-ink-900 shadow-sm' : 'text-ink-600'}`}
            >
              {t}
            </button>
          ))}
        </div>
      }
    >
      {tab === 'write' ? (
        <>
          <div className="mb-2 flex flex-wrap items-center gap-1.5" role="toolbar" aria-label="Formatting">
            {TOOLS.map(([label, title, action]) => (
              <button
                key={title}
                type="button"
                title={title}
                aria-label={title}
                onClick={() => run(action)}
                className="rounded-lg border border-black/10 bg-white px-2.5 py-1 text-xs font-semibold text-ink-900 hover:border-brand-600 hover:text-brand-700"
              >
                {label}
              </button>
            ))}
            <Uploader folder="articles" label="Upload image" onUploaded={insertImage} />
          </div>
          <textarea
            ref={ref}
            aria-label="Article body in Markdown"
            aria-invalid={Boolean(error)}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            rows={24}
            spellCheck
            placeholder={'## First section\n\nWrite a paragraph here. Use **bold**, *italic* and [links](/shop).\n\n- A bullet point\n- Another one'}
            className="field font-mono text-sm leading-relaxed"
          />
          <div className="mt-2 flex flex-wrap justify-between gap-2 text-xs text-ink-400">
            <span>
              {words} words · about {Math.max(1, Math.round(words / 200))} min read
            </span>
            {error && <span className="font-medium text-navy-800">{error}</span>}
          </div>
          <details className="mt-3 rounded-xl bg-surface-soft p-3 text-sm">
            <summary className="cursor-pointer font-semibold text-ink-900">Markdown cheat sheet</summary>
            <table className="mt-3 w-full text-left text-xs">
              <tbody className="divide-y divide-black/5">
                {HELP.map(([md, what]) => (
                  <tr key={what}>
                    <td className="py-1.5 pr-4 align-top">
                      <code className="whitespace-pre font-mono text-ink-900">{md}</code>
                    </td>
                    <td className="py-1.5 text-ink-600">{what}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </details>
        </>
      ) : (
        <div className="min-h-[300px] rounded-xl border border-black/5 bg-white p-2 sm:p-4">
          {blocks.length ? <ArticleBody blocks={blocks} /> : <Empty>Nothing to preview yet.</Empty>}
        </div>
      )}
    </Panel>
  )
}

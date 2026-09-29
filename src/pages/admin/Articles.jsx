import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { blogCategories } from '../../content/blogData.js'
import { api, fieldErrors } from '../../lib/api.js'
import { useApi } from '../../lib/useApi.js'
import { dateTime, mediaUrl, btn, slugify, toEditable, fromEditable } from './format.js'
import { Empty, Field, LoadState, PageTitle, Panel, Pill, Uploader } from './ui.jsx'

const BLOCK_TYPES = [
  { type: 'h2', label: 'Heading' },
  { type: 'p', label: 'Paragraph' },
  { type: 'list', label: 'Bullet list' },
  { type: 'table', label: 'Table' },
  { type: 'code', label: 'Code' },
  { type: 'diagram', label: 'Diagram / image caption' },
]
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
  const [blocks, setBlocks] = useState(() => (article?.body ?? [{ type: 'p', text: '' }]).map(toEditable))
  const [coverKey, setCoverKey] = useState(article?.coverKey ?? null)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState({ error: '', fields: {}, saved: '' })

  const update = (i, patch) => setBlocks((bs) => bs.map((b, j) => (j === i ? { ...b, ...patch } : b)))
  const move = (i, d) =>
    setBlocks((bs) => {
      const next = [...bs]
      const j = i + d
      if (j < 0 || j >= next.length) return bs
      ;[next[i], next[j]] = [next[j], next[i]]
      return next
    })

  const submit = async (e) => {
    e.preventDefault()
    const d = Object.fromEntries(new FormData(e.currentTarget))
    const slug = article?.slug ?? slugify(d.slug || d.title)
    const payload = {
      title: d.title,
      seoTitle: d.seoTitle || undefined,
      category: d.category,
      excerpt: d.excerpt || undefined,
      body: blocks.filter((b) => b.text?.trim()).map(fromEditable),
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

        <Panel title="Body">
          <ol className="grid gap-4">
            {blocks.map((b, i) => (
              <li key={i} className="rounded-xl border border-black/10 p-3">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <select aria-label={`Block ${i + 1} type`} className="field w-auto! py-1.5!" value={b.type} onChange={(e) => update(i, { type: e.target.value })}>
                    {BLOCK_TYPES.map((t) => (
                      <option key={t.type} value={t.type}>{t.label}</option>
                    ))}
                  </select>
                  <div className="flex gap-3 text-xs">
                    <button type="button" className={btn.link} onClick={() => move(i, -1)} disabled={i === 0}>↑ Up</button>
                    <button type="button" className={btn.link} onClick={() => move(i, 1)} disabled={i === blocks.length - 1}>↓ Down</button>
                    <button type="button" className="font-semibold text-ink-400 hover:text-navy-800" onClick={() => setBlocks((bs) => bs.filter((_, j) => j !== i))}>Delete</button>
                  </div>
                </div>
                {b.type === 'h2' || b.type === 'diagram' ? (
                  <input aria-label="Text" className="field" value={b.text ?? ''} onChange={(e) => update(i, { text: e.target.value })} />
                ) : (
                  <textarea
                    aria-label="Text"
                    rows={b.type === 'p' ? 4 : 6}
                    className={`field ${b.type === 'code' ? 'font-mono text-xs' : ''}`}
                    value={b.text ?? ''}
                    onChange={(e) => update(i, { text: e.target.value })}
                    placeholder={b.type === 'list' ? 'One item per line' : b.type === 'table' ? 'Header | Header\nCell | Cell' : ''}
                  />
                )}
              </li>
            ))}
          </ol>
          <div className="mt-4 flex flex-wrap gap-2">
            {BLOCK_TYPES.map((t) => (
              <button key={t.type} type="button" className={btn.secondary} onClick={() => setBlocks((bs) => [...bs, { type: t.type, text: '' }])}>
                + {t.label}
              </button>
            ))}
          </div>
        </Panel>
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

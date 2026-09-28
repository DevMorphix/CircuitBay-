import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { api } from '../../lib/api.js'
import { useApi } from '../../lib/useApi.js'
import { linesToList, mediaUrl, btn } from './format.js'
import { Empty, Field, LoadState, PageTitle, Pill, Uploader } from './ui.jsx'

const FILTERS = [
  { id: 'pending', label: 'To review' },
  { id: 'published', label: 'Published' },
  { id: 'rejected', label: 'Rejected' },
]

// Community projects: review submissions, publish, feature, add photos.
export function ProjectsAdmin() {
  const [params, setParams] = useSearchParams()
  const status = FILTERS.some((f) => f.id === params.get('status')) ? params.get('status') : 'pending'
  const { data, error, loading, reload } = useApi(`/admin/projects?status=${status}`)

  return (
    <>
      <PageTitle title="Community projects" subtitle="Submissions from the site wait here until you publish them." />
      <div className="mb-4 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            aria-pressed={status === f.id}
            onClick={() => setParams({ status: f.id }, { replace: true })}
            className={`rounded-full px-4 py-2 text-sm font-semibold ${status === f.id ? 'bg-brand-600 text-white' : 'bg-white text-ink-600 shadow-sm hover:text-brand-700'}`}
          >
            {f.label}
          </button>
        ))}
      </div>
      <LoadState loading={loading} error={error}>
        {data?.projects.length === 0 ? (
          <div className="card"><Empty>Nothing here.</Empty></div>
        ) : (
          <ul className="grid gap-4">
            {data?.projects.map((p) => (
              <ProjectRow key={p.id} project={p} onChanged={reload} />
            ))}
          </ul>
        )}
      </LoadState>
    </>
  )
}

function ProjectRow({ project: p, onChanged }) {
  const [imageKey, setImageKey] = useState(p.imageKey ?? null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const save = async (e, extra = {}) => {
    e?.preventDefault()
    const form = e?.currentTarget?.form ?? e?.currentTarget
    const d = form ? Object.fromEntries(new FormData(form)) : {}
    setBusy(true)
    setError('')
    try {
      await api.patch(`/admin/projects/${p.id}`, {
        title: d.title,
        blurb: d.blurb,
        category: d.category,
        tags: linesToList((d.tags ?? '').replace(/,/g, '\n')),
        featured: d.featured === 'on',
        imageKey,
        ...extra,
      })
      onChanged()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <li className="card p-5">
      <form onSubmit={save} className="grid gap-4 lg:grid-cols-[180px_1fr]">
        <div>
          {imageKey ? (
            <img src={mediaUrl(imageKey)} alt="" className="aspect-[4/3] w-full rounded-lg border border-black/10 object-cover" />
          ) : (
            <div className="photo-placeholder aspect-[4/3] rounded-lg">No photo</div>
          )}
          <div className="mt-2">
            <Uploader folder="projects" label={imageKey ? 'Replace photo' : 'Add photo'} onUploaded={(u) => setImageKey(u[0].key)} />
          </div>
        </div>
        <div className="grid gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Pill tone={p.status === 'published' ? 'active' : 'muted'}>{p.status}</Pill>
            {p.featured && <Pill tone="new">Featured</Pill>}
            <span className="text-xs text-ink-400">
              by {p.builder ?? 'unknown'}
              {p.builderEmail && (
                <>
                  {' '}· <a href={`mailto:${p.builderEmail}`} className="hover:text-brand-700">{p.builderEmail}</a>
                </>
              )}
              {p.link && (
                <>
                  {' '}· <a href={p.link} target="_blank" rel="noreferrer" className="hover:text-brand-700">link</a>
                </>
              )}
            </span>
          </div>
          {p.description && <p className="rounded-lg bg-surface-soft p-3 text-sm text-ink-900">{p.description}</p>}
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Title" id={`t-${p.id}`} name="title" defaultValue={p.title} />
            <Field label="Category" id={`c-${p.id}`} name="category" defaultValue={p.category ?? ''} placeholder="IoT, Robotics, AI…" />
            <Field label="One-line summary (shown on cards)" id={`b-${p.id}`} name="blurb" defaultValue={p.blurb ?? ''} className="sm:col-span-2" />
            <Field label="Components (comma-separated)" id={`g-${p.id}`} name="tags" defaultValue={(p.tags ?? []).join(', ')} className="sm:col-span-2" />
          </div>
          <label className="flex items-center gap-2 text-sm text-ink-900">
            <input type="checkbox" name="featured" defaultChecked={p.featured} className="h-4 w-4 accent-brand-600" /> Feature on the projects page
          </label>
          {error && <p role="alert" className="text-sm font-medium text-navy-800">{error}</p>}
          <div className="flex flex-wrap gap-3">
            {p.status !== 'published' && (
              <button type="button" disabled={busy} className={btn.primary} onClick={(e) => save(e, { status: 'published' })}>Publish</button>
            )}
            <button type="submit" disabled={busy} className={btn.secondary}>Save</button>
            {p.status === 'published' && (
              <button type="button" disabled={busy} className={btn.secondary} onClick={(e) => save(e, { status: 'pending' })}>Unpublish</button>
            )}
            {p.status !== 'rejected' && (
              <button type="button" disabled={busy} className={btn.danger} onClick={(e) => save(e, { status: 'rejected' })}>Reject</button>
            )}
          </div>
        </div>
      </form>
    </li>
  )
}

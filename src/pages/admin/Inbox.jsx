import { useSearchParams } from 'react-router-dom'
import { api } from '../../lib/api.js'
import { useApi } from '../../lib/useApi.js'
import { dateTime, btn } from './format.js'
import { Empty, LoadState, PageTitle, Panel, Pill } from './ui.jsx'

const TABS = [
  { id: 'messages', label: 'Messages & part requests' },
  { id: 'workshops', label: 'Workshop requests' },
  { id: 'newsletter', label: 'Newsletter' },
]
const WORKSHOP_STATUSES = ['new', 'contacted', 'scheduled', 'closed']

export function Inbox() {
  const [params, setParams] = useSearchParams()
  const tab = TABS.some((t) => t.id === params.get('tab')) ? params.get('tab') : 'messages'
  return (
    <>
      <PageTitle title="Inbox" subtitle="Everything people send through the site's forms." />
      <div role="tablist" aria-label="Inbox" className="mb-4 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            type="button"
            aria-selected={tab === t.id}
            onClick={() => setParams({ tab: t.id }, { replace: true })}
            className={`rounded-full px-4 py-2 text-sm font-semibold ${tab === t.id ? 'bg-brand-600 text-white' : 'bg-white text-ink-600 shadow-sm hover:text-brand-700'}`}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tab === 'messages' && <Messages />}
      {tab === 'workshops' && <Workshops />}
      {tab === 'newsletter' && <Newsletter />}
    </>
  )
}

function Messages() {
  const { data, error, loading, reload } = useApi('/admin/contact-messages?limit=100')
  const setStatus = async (id, status) => {
    await api.patch(`/admin/contact-messages/${id}`, { status })
    reload()
  }
  return (
    <LoadState loading={loading} error={error}>
      {data?.items.length === 0 ? (
        <Panel><Empty>No messages yet.</Empty></Panel>
      ) : (
        <ul className="grid gap-3">
          {data?.items.map((m) => (
            <li key={m.id} className={`card p-5 ${m.status === 'new' ? 'ring-2 ring-brand-600/30' : 'opacity-80'}`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-ink-900">
                    {m.name} {m.role && <span className="font-normal text-ink-400">· {m.role}</span>}
                  </p>
                  <p className="text-sm text-ink-600">
                    <a href={`mailto:${m.email}`} className="hover:text-brand-700">{m.email}</a>
                    {m.phone && <> · <a href={`tel:${m.phone}`} className="hover:text-brand-700">{m.phone}</a></>} · {dateTime(m.created_at)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {m.message.startsWith('Part request:') && <Pill tone="active">Part request</Pill>}
                  {m.status === 'new' ? (
                    <button type="button" className={btn.secondary} onClick={() => setStatus(m.id, 'handled')}>Mark handled</button>
                  ) : (
                    <button type="button" className={btn.link} onClick={() => setStatus(m.id, 'new')}>Reopen</button>
                  )}
                </div>
              </div>
              <p className="mt-3 whitespace-pre-line text-sm text-ink-900">{m.message}</p>
            </li>
          ))}
        </ul>
      )}
    </LoadState>
  )
}

function Workshops() {
  const { data, error, loading, reload } = useApi('/admin/workshop-requests?limit=100')
  const setStatus = async (id, status) => {
    await api.patch(`/admin/workshop-requests/${id}`, { status })
    reload()
  }
  return (
    <LoadState loading={loading} error={error}>
      {data?.items.length === 0 ? (
        <Panel><Empty>No workshop requests yet.</Empty></Panel>
      ) : (
        <ul className="grid gap-3">
          {data?.items.map((w) => (
            <li key={w.id} className={`card p-5 ${w.status === 'new' ? 'ring-2 ring-brand-600/30' : ''}`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-ink-900">{w.institution}</p>
                  <p className="text-sm text-ink-600">
                    {w.contact_name} · <a href={`mailto:${w.email}`} className="hover:text-brand-700">{w.email}</a> · <a href={`tel:${w.phone}`} className="hover:text-brand-700">{w.phone}</a>
                  </p>
                  <p className="mt-1 text-sm text-ink-600">
                    {w.interest ?? 'General'}
                    {w.student_count ? ` · ~${w.student_count} students` : ''} · {dateTime(w.created_at)}
                  </p>
                </div>
                <select aria-label={`Status for ${w.institution}`} className="field w-auto!" value={w.status} onChange={(e) => setStatus(w.id, e.target.value)}>
                  {WORKSHOP_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s[0].toUpperCase() + s.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
              {w.message && <p className="mt-3 whitespace-pre-line text-sm text-ink-900">{w.message}</p>}
            </li>
          ))}
        </ul>
      )}
    </LoadState>
  )
}

function Newsletter() {
  const { data, error, loading } = useApi('/admin/newsletter?limit=100')
  const subscribed = data?.items.filter((s) => s.status === 'subscribed') ?? []

  // CSV of every subscribed address (all pages) for a mailing tool
  const exportCsv = async () => {
    const all = []
    for (let page = 1; ; page++) {
      const { items } = await api.get(`/admin/newsletter?status=subscribed&limit=100&page=${page}`)
      all.push(...items)
      if (items.length < 100) break
    }
    const rows = [['email', 'source', 'subscribed_at'], ...all.map((s) => [s.email, s.source ?? '', new Date(s.created_at).toISOString()])]
    const csv = rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    const a = Object.assign(document.createElement('a'), { href: url, download: `circuitbay-subscribers-${new Date().toISOString().slice(0, 10)}.csv` })
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <Panel
      title={data ? `${subscribed.length} subscribed` : 'Subscribers'}
      action={subscribed.length > 0 && <button type="button" className={btn.secondary} onClick={exportCsv}>Export CSV</button>}
    >
      <LoadState loading={loading} error={error}>
        {data?.items.length === 0 ? (
          <Empty>No subscribers yet.</Empty>
        ) : (
          <ul className="divide-y divide-black/5 text-sm">
            {data?.items.map((s) => (
              <li key={s.email} className="flex flex-wrap justify-between gap-3 py-2">
                <span className="text-ink-900">{s.email}</span>
                <span className="text-ink-400">
                  {s.source ?? '—'} · {dateTime(s.created_at)} {s.status !== 'subscribed' && <Pill tone="muted">Unsubscribed</Pill>}
                </span>
              </li>
            ))}
          </ul>
        )}
        {data?.items.length === 100 && <p className="mt-3 text-xs text-ink-400">Showing the newest 100.</p>}
      </LoadState>
    </Panel>
  )
}

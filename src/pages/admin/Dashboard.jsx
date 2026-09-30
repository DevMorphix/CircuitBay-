import { Link } from 'react-router-dom'
import { useApi } from '../../lib/useApi.js'
import { rupees, ORDER_STATUS } from './format.js'
import { LoadState, PageTitle, Panel, StatusPill } from './ui.jsx'

// What needs attention today: sales, orders to fulfil, low stock, inbox.
export function Dashboard() {
  const { data, error, loading } = useApi('/admin/stats')

  return (
    <>
      <PageTitle title="Dashboard" subtitle="Last 30 days and what needs attention now." />
      <LoadState loading={loading} error={error}>
        {data && (
          <div className="grid gap-5">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <Stat label="Paid orders (30 days)" value={data.last30Days.orders} />
              <Stat label="Revenue (30 days)" value={rupees(data.last30Days.revenue)} />
              <Stat label="To fulfil" value={(data.ordersByStatus.placed ?? 0) + (data.ordersByStatus.confirmed ?? 0) + (data.ordersByStatus.packed ?? 0)} to="/admin/orders?status=placed" />
              <Stat
                label="Refunds needed"
                value={data.inbox.refundsNeeded}
                to="/admin/orders?status=cancelled"
                highlight={data.inbox.refundsNeeded > 0}
                hint="Paid after the stock hold expired and stock ran out — refund in Razorpay."
              />
            </div>

            <div className="grid gap-5 xl:grid-cols-3">
              <Panel title="Orders by status" className="xl:col-span-1">
                <ul className="space-y-2">
                  {Object.keys(ORDER_STATUS).map((s) => (
                    <li key={s}>
                      <Link to={`/admin/orders?status=${s}`} className="flex items-center justify-between rounded-lg px-2 py-1.5 hover:bg-surface-soft">
                        <StatusPill status={s} />
                        <span className="font-semibold text-ink-900">{data.ordersByStatus[s] ?? 0}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </Panel>

              <Panel title="Low stock" action={<Link to="/admin/products" className="text-sm font-semibold text-brand-700">All products →</Link>}>
                {data.lowStock.length === 0 ? (
                  <p className="text-sm text-ink-600">Everything is well stocked.</p>
                ) : (
                  <ul className="divide-y divide-black/5">
                    {data.lowStock.map((p) => (
                      <li key={p.id}>
                        <Link to={`/admin/products/${p.id}`} className="flex items-center justify-between py-2 text-sm hover:text-brand-700">
                          <span className="text-ink-900">{p.name}</span>
                          <span className={`font-semibold ${p.stock === 0 ? 'text-navy-800' : 'text-ink-600'}`}>{p.stock === 0 ? 'Sold out' : `${p.stock} left`}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </Panel>

              <Panel title="Inbox" action={<Link to="/admin/inbox" className="text-sm font-semibold text-brand-700">Open inbox →</Link>}>
                <ul className="space-y-3 text-sm">
                  <InboxRow label="New messages" value={data.inbox.messages} to="/admin/inbox?tab=messages" />
                  <InboxRow label="Workshop requests" value={data.inbox.workshops} to="/admin/inbox?tab=workshops" />
                  <InboxRow label="Projects to review" value={data.inbox.projects} to="/admin/projects?status=pending" />
                  <InboxRow label="Product reviews to approve" value={data.inbox.reviews} to="/admin/reviews" />
                </ul>
              </Panel>
            </div>
          </div>
        )}
      </LoadState>
    </>
  )
}

function Stat({ label, value, to, highlight = false, hint }) {
  const body = (
    <>
      <p className="text-sm font-medium text-ink-600">{label}</p>
      <p className={`mt-2 font-heading text-3xl font-semibold ${highlight ? 'text-navy-800' : 'text-ink-900'}`}>{value}</p>
      {hint && highlight && <p className="mt-2 text-xs text-ink-600">{hint}</p>}
    </>
  )
  return to ? (
    <Link to={to} className={`card card-hover block p-5 ${highlight ? 'ring-2 ring-navy-800/30' : ''}`}>
      {body}
    </Link>
  ) : (
    <div className="card p-5">{body}</div>
  )
}

function InboxRow({ label, value, to }) {
  return (
    <li>
      <Link to={to} className="flex items-center justify-between rounded-lg px-2 py-1.5 hover:bg-surface-soft">
        <span className="text-ink-900">{label}</span>
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${value > 0 ? 'bg-brand-600 text-white' : 'bg-black/5 text-ink-600'}`}>{value}</span>
      </Link>
    </li>
  )
}

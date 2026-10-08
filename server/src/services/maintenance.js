import { releaseExpiredHolds } from './orders.js'
import { syncShipments } from './shipments.js'

// Periodic cleanup — every 10 minutes (Worker cron trigger, or a timer in
// node.js). Cheap: each statement hits an index or a small table.
export async function runMaintenance(db, now = Date.now()) {
  const DAY = 86_400_000
  const released = await releaseExpiredHolds(db, now)
  await db.batch([
    { sql: 'DELETE FROM sessions WHERE expires_at < ?', params: [now] },
    { sql: 'DELETE FROM verification_codes WHERE expires_at < ?', params: [now - DAY] },
    { sql: 'DELETE FROM rate_limits WHERE window_start < ?', params: [now - DAY] },
  ])
  return { released }
}

// Everything the 10-minute job does: cleanup, plus checking courier
// tracking for shipments whose webhook updates may have been missed.
export async function runScheduled(svc, now = Date.now()) {
  const { released } = await runMaintenance(svc.db, now)
  const tracked = await syncShipments(svc, now)
  return { released, tracked }
}

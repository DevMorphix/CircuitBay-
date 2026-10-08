import { serve } from '@hono/node-server'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { createApp, buildServices } from './app.js'
import { loadConfig } from './config.js'
import { createSqliteDb, migrateSqlite } from './db/sqlite.js'
import { createD1HttpDb } from './db/d1-http.js'
import { createR2S3Storage } from './storage/r2-s3.js'
import { createLocalDiskStorage } from './storage/local-disk.js'
import { runScheduled } from './services/maintenance.js'
import { createMemoryCache } from './lib/cache.js'

// Plain Node.js entry. Choose adapters with env vars:
//   DB_DRIVER=sqlite  (default) local file at SQLITE_PATH, auto-migrated
//   DB_DRIVER=d1-http Cloudflare D1 over the REST API
//   STORAGE_DRIVER=local (default) files under LOCAL_STORAGE_DIR
//   STORAGE_DRIVER=r2    Cloudflare R2 over its S3-compatible API
const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const env = process.env
const config = loadConfig(env)

function required(name) {
  if (!env[name]) throw new Error(`${name} is required for this driver (see .env.example)`)
  return env[name]
}

let db
if ((env.DB_DRIVER ?? 'sqlite') === 'd1-http') {
  db = createD1HttpDb({
    accountId: required('CLOUDFLARE_ACCOUNT_ID'),
    databaseId: required('D1_DATABASE_ID'),
    apiToken: required('CLOUDFLARE_API_TOKEN'),
  })
} else {
  db = createSqliteDb(env.SQLITE_PATH ?? join(root, '.data', 'local.sqlite'))
  const applied = migrateSqlite(db, join(root, 'migrations'))
  if (applied.length) console.log(`Applied migrations: ${applied.join(', ')}`)
}

const storage =
  (env.STORAGE_DRIVER ?? 'local') === 'r2'
    ? createR2S3Storage({
        accountId: required('CLOUDFLARE_ACCOUNT_ID'),
        bucket: required('R2_BUCKET'),
        accessKeyId: required('R2_ACCESS_KEY_ID'),
        secretAccessKey: required('R2_SECRET_ACCESS_KEY'),
      })
    : createLocalDiskStorage(env.LOCAL_STORAGE_DIR ?? join(root, '.data', 'uploads'))

const services = buildServices({ config, db, storage, cache: createMemoryCache() })
const app = createApp(() => services)

const port = Number(env.PORT ?? 8787)
serve({ fetch: app.fetch, port }, () => {
  console.log(`CircuitBay API on http://localhost:${port}  (db=${db.kind}, storage=${storage.kind}, payments=${services.payments.name}, courier=${services.courier?.name ?? 'manual'}, env=${config.APP_ENV})`)
})

// Housekeeping every 10 minutes (the Worker uses a cron trigger instead)
const maintain = () =>
  runScheduled(services).catch((err) => {
    console.error('maintenance failed', err)
    return services.reportError(err, { tags: { job: 'maintenance' } })
  })
maintain()
setInterval(maintain, 10 * 60 * 1000).unref()

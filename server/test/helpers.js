import { mkdtempSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createApp, buildServices } from '../src/app.js'
import { loadConfig } from '../src/config.js'
import { createSqliteDb, migrateSqlite } from '../src/db/sqlite.js'
import { createLocalDiskStorage } from '../src/storage/local-disk.js'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

// Fresh app per test file: in-memory SQLite (migrated + seeded), temp-dir
// storage, console email/SMS captured in memory.
export function setup(envOverrides = {}) {
  const config = loadConfig({ APP_ENV: 'test', ADMIN_EMAILS: 'admin@example.com', ...envOverrides })
  const db = createSqliteDb(':memory:')
  migrateSqlite(db, join(root, 'migrations'))
  db.raw.exec(readFileSync(join(root, 'seed', 'seed.sql'), 'utf8'))
  const storage = createLocalDiskStorage(mkdtempSync(join(tmpdir(), 'cb-test-')))
  const svc = buildServices({ config, db, storage, log: () => {} })
  const app = createApp(() => svc)
  return { app, svc, db }
}

// Minimal cookie-jar client around app.request()
export function client(app) {
  let cookie = ''
  const request = async (method, path, body, headers = {}) => {
    const init = { method, headers: { ...headers } }
    if (cookie) init.headers.cookie = cookie
    if (body instanceof FormData) init.body = body
    else if (body !== undefined) {
      init.body = JSON.stringify(body)
      init.headers['content-type'] = 'application/json'
    }
    const res = await app.request(path, init)
    const set = res.headers.get('set-cookie')
    if (set) {
      const [pair] = set.split(';')
      cookie = pair.endsWith('=') ? '' : pair
    }
    const text = await res.text()
    let json
    try {
      json = JSON.parse(text)
    } catch {
      json = text
    }
    return { status: res.status, body: json, headers: res.headers }
  }
  return {
    get: (p, h) => request('GET', p, undefined, h),
    post: (p, b, h) => request('POST', p, b, h),
    put: (p, b, h) => request('PUT', p, b, h),
    patch: (p, b, h) => request('PATCH', p, b, h),
    del: (p, h) => request('DELETE', p, undefined, h),
    raw: request,
  }
}

// Applies migrations to the local SQLite database (and the seed with --seed).
// For D1 use `npm run db:migrate:d1` / `npm run db:seed:d1` (wrangler).
import { readFileSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createSqliteDb, migrateSqlite } from '../src/db/sqlite.js'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const db = createSqliteDb(process.env.SQLITE_PATH ?? join(root, '.data', 'local.sqlite'))

const applied = migrateSqlite(db, join(root, 'migrations'))
console.log(applied.length ? `Applied: ${applied.join(', ')}` : 'Migrations up to date.')

if (process.argv.includes('--seed')) {
  const seedFile = join(root, 'seed', 'seed.sql')
  if (!existsSync(seedFile)) throw new Error('seed/seed.sql missing — run `npm run db:seed:build` first')
  db.raw.exec(readFileSync(seedFile, 'utf8'))
  console.log('Seed data loaded.')
}

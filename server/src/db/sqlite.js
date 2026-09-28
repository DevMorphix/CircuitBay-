import { DatabaseSync } from 'node:sqlite'
import { mkdirSync, readdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { cleanParams } from './index.js'

// Adapter over Node's built-in SQLite (Node >= 22.5). Used for local
// development and tests — same SQL dialect as D1.
export function createSqliteDb(filename = ':memory:') {
  if (filename !== ':memory:') mkdirSync(dirname(filename), { recursive: true })
  const db = new DatabaseSync(filename)
  db.exec('PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL;')

  const stmt = (sql) => db.prepare(sql)
  // node:sqlite returns null-prototype objects; normalise to plain objects
  const plain = (row) => (row ? { ...row } : row)

  return {
    kind: 'sqlite',
    raw: db,
    async all(sql, params) {
      return stmt(sql).all(...cleanParams(params)).map(plain)
    },
    async first(sql, params) {
      return plain(stmt(sql).get(...cleanParams(params))) ?? null
    },
    async run(sql, params) {
      const res = stmt(sql).run(...cleanParams(params))
      return { changes: Number(res.changes) }
    },
    async batch(statements) {
      db.exec('BEGIN')
      try {
        const out = statements.map((s) => {
          const st = stmt(s.sql)
          const p = cleanParams(s.params)
          // Statements with RETURNING or SELECT yield rows; others just run
          return st.columns().length ? st.all(...p).map(plain) : (st.run(...p), [])
        })
        db.exec('COMMIT')
        return out
      } catch (err) {
        db.exec('ROLLBACK')
        throw err
      }
    },
  }
}

// Applies migrations/*.sql in order, tracking them in `d1_migrations` —
// the same table name wrangler uses, so the history reads the same.
export function migrateSqlite(db, migrationsDir) {
  db.raw.exec(`CREATE TABLE IF NOT EXISTS d1_migrations (
    id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE, applied_at TEXT DEFAULT CURRENT_TIMESTAMP)`)
  const done = new Set(db.raw.prepare('SELECT name FROM d1_migrations').all().map((r) => r.name))
  const files = readdirSync(migrationsDir).filter((f) => f.endsWith('.sql')).sort()
  const applied = []
  for (const file of files) {
    if (done.has(file)) continue
    db.raw.exec('BEGIN')
    try {
      db.raw.exec(readFileSync(join(migrationsDir, file), 'utf8'))
      db.raw.prepare('INSERT INTO d1_migrations (name) VALUES (?)').run(file)
      db.raw.exec('COMMIT')
      applied.push(file)
    } catch (err) {
      db.raw.exec('ROLLBACK')
      throw new Error(`Migration ${file} failed: ${err.message}`)
    }
  }
  return applied
}

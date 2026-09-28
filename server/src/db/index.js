// Database interface used by every route. Three adapters implement it:
//
//   d1.js        Cloudflare D1 binding        (Workers — recommended prod)
//   d1-http.js   Cloudflare D1 REST API        (Node server talking to D1)
//   sqlite.js    node:sqlite file / in-memory  (local dev + tests)
//
// Shape:
//   all(sql, params?)    -> Promise<row[]>
//   first(sql, params?)  -> Promise<row | null>
//   run(sql, params?)    -> Promise<{ changes: number }>
//   batch([{ sql, params }]) -> Promise<row[][]>   (atomic where supported)
//
// SQL is plain SQLite with `?` placeholders.

// D1/sqlite reject `undefined`; normalise params once here.
export const cleanParams = (params = []) =>
  params.map((p) => (p === undefined ? null : typeof p === 'boolean' ? (p ? 1 : 0) : p))

// Column helpers for JSON TEXT columns
export const json = (value) => JSON.stringify(value ?? null)
export const parseJson = (text, fallback) => {
  if (text == null) return fallback
  try {
    return JSON.parse(text)
  } catch {
    return fallback
  }
}

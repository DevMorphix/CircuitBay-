import { cleanParams } from './index.js'

// Adapter over the Cloudflare D1 REST API, for running the API as a plain
// Node server against a real D1 database.
//
// Caveats (see README): every query is an HTTPS round-trip to Cloudflare,
// it counts against the account-wide API rate limit, and `batch` is NOT
// atomic here (statements run one by one). For production traffic prefer
// the Worker deployment, which uses the native binding.
export function createD1HttpDb({ accountId, databaseId, apiToken, fetchImpl = fetch }) {
  const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/d1/database/${databaseId}/query`

  async function query(sql, params) {
    const res = await fetchImpl(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ sql, params: cleanParams(params) }),
    })
    const body = await res.json().catch(() => null)
    if (!res.ok || !body?.success) {
      const msg = body?.errors?.map((e) => e.message).join('; ') || `HTTP ${res.status}`
      throw new Error(`D1 HTTP query failed: ${msg}`)
    }
    const result = body.result?.[0] ?? {}
    return { rows: result.results ?? [], changes: result.meta?.changes ?? 0 }
  }

  return {
    kind: 'd1-http',
    async all(sql, params) {
      return (await query(sql, params)).rows
    },
    async first(sql, params) {
      return (await query(sql, params)).rows[0] ?? null
    },
    async run(sql, params) {
      return { changes: (await query(sql, params)).changes }
    },
    async batch(statements) {
      const out = []
      for (const s of statements) out.push((await query(s.sql, s.params)).rows)
      return out
    },
  }
}

import { cleanParams } from './index.js'

// Adapter over a Cloudflare D1 binding (env.DB inside a Worker).
export function createD1Db(binding) {
  const prep = (sql, params) => binding.prepare(sql).bind(...cleanParams(params))
  return {
    kind: 'd1',
    async all(sql, params) {
      return (await prep(sql, params).all()).results ?? []
    },
    async first(sql, params) {
      return (await prep(sql, params).first()) ?? null
    },
    async run(sql, params) {
      const res = await prep(sql, params).run()
      return { changes: res.meta?.changes ?? 0 }
    },
    // D1 batches run inside a single implicit transaction
    async batch(statements) {
      const res = await binding.batch(statements.map((s) => prep(s.sql, s.params)))
      return res.map((r) => r.results ?? [])
    },
  }
}

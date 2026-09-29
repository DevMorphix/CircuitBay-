import { createApp, buildServices } from './app.js'
import { loadConfig } from './config.js'
import { createD1Db } from './db/d1.js'
import { createR2BindingStorage } from './storage/r2-binding.js'
import { runMaintenance } from './services/maintenance.js'
import { createEdgeCache } from './lib/cache.js'
import { createErrorReporter } from './lib/monitoring.js'

// Cloudflare Workers entry (recommended for production): D1 and R2 are
// native bindings (env.DB, env.BUCKET — see wrangler.toml).
let cached // services are rebuilt only if the env object changes

const app = createApp((c) => {
  if (cached?.env !== c.env) {
    cached = {
      env: c.env,
      svc: buildServices({
        config: loadConfig(c.env),
        db: createD1Db(c.env.DB),
        storage: createR2BindingStorage(c.env.BUCKET),
        cache: createEdgeCache(),
      }),
    }
  }
  return cached.svc
})

export default {
  fetch: app.fetch,

  // Housekeeping every 10 minutes (cron trigger in wrangler.toml)
  async scheduled(_event, env, ctx) {
    const report = createErrorReporter(loadConfig(env))
    ctx.waitUntil(
      runMaintenance(createD1Db(env.DB)).catch(async (err) => {
        console.error('maintenance failed', err)
        await report(err, { tags: { job: 'maintenance' } })
      }),
    )
  },
}

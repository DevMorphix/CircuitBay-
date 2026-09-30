// Starts a throwaway API for the browser tests: fresh SQLite database with
// the seed catalog, fake payments and a fake courier, emails/SMS printed to
// the console. Started by playwright.config.js (webServer).
import { execFileSync } from 'node:child_process'
import { mkdirSync, rmSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const serverDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'server')
const dataDir = join(serverDir, '.data', 'e2e')
rmSync(dataDir, { recursive: true, force: true })
mkdirSync(dataDir, { recursive: true })

Object.assign(process.env, {
  APP_ENV: 'development',
  PORT: process.env.E2E_API_PORT ?? '8790',
  SQLITE_PATH: join(dataDir, 'e2e.sqlite'),
  LOCAL_STORAGE_DIR: join(dataDir, 'uploads'),
  SITE_URL: `http://localhost:${process.env.E2E_WEB_PORT ?? '5190'}`,
  CORS_ORIGINS: `http://localhost:${process.env.E2E_WEB_PORT ?? '5190'}`,
  ADMIN_EMAILS: 'admin@e2e.test',
  PAYMENTS_PROVIDER: 'fake',
  COURIER_PROVIDER: 'fake',
  EMAIL_PROVIDER: 'console',
  SMS_PROVIDER: 'console',
})

const run = (script, ...args) => execFileSync(process.execPath, [join(serverDir, 'scripts', script), ...args], { cwd: serverDir, stdio: 'inherit', env: process.env })
run('build-seed.js')
run('migrate-local.js', '--seed')

await import('../server/src/node.js')

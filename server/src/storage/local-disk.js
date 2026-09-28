import { mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { dirname, join, resolve, sep } from 'node:path'

// Local-disk stand-in for R2 (dev/tests). Stores `<key>` plus a
// `<key>.meta.json` sidecar for the content type.
export function createLocalDiskStorage(rootDir) {
  const root = resolve(rootDir)
  const pathFor = (key) => {
    const p = resolve(join(root, key))
    if (!p.startsWith(root + sep)) throw new Error('Invalid storage key')
    return p
  }

  return {
    kind: 'local-disk',
    async put(key, body, { contentType } = {}) {
      const p = pathFor(key)
      await mkdir(dirname(p), { recursive: true })
      await writeFile(p, new Uint8Array(body))
      await writeFile(`${p}.meta.json`, JSON.stringify({ contentType }))
    },
    async get(key) {
      const p = pathFor(key)
      try {
        const [body, info] = await Promise.all([readFile(p), stat(p)])
        const meta = JSON.parse(await readFile(`${p}.meta.json`, 'utf8').catch(() => '{}'))
        return {
          body: new Uint8Array(body),
          contentType: meta.contentType ?? 'application/octet-stream',
          size: info.size,
          etag: `"${info.mtimeMs.toString(36)}-${info.size.toString(36)}"`,
        }
      } catch (err) {
        if (err.code === 'ENOENT') return null
        throw err
      }
    },
    async delete(key) {
      const p = pathFor(key)
      await rm(p, { force: true })
      await rm(`${p}.meta.json`, { force: true })
    },
  }
}

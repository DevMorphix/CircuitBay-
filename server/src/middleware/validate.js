import { zValidator } from '@hono/zod-validator'
import { badRequest } from '../lib/errors.js'

const hook = (result) => {
  if (!result.success) {
    const details = result.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message }))
    throw badRequest('Some fields need another look.', details)
  }
}

// Usage: app.post('/x', body(schema), (c) => { const data = c.req.valid('json') })
export const body = (schema) => zValidator('json', schema, hook)
export const query = (schema) => zValidator('query', schema, hook)

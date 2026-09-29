import { z } from 'zod'

const csv = z
  .string()
  .optional()
  .transform((v) => (v ? v.split(',').map((s) => s.trim()).filter(Boolean) : []))

// All runtime configuration comes from environment variables (Node:
// process.env / .env; Workers: wrangler.toml [vars] + secrets).
const schema = z
  .object({
    APP_ENV: z.enum(['development', 'test', 'production']).default('development'),
    // Frontend origins allowed to call the API with cookies (CORS)
    CORS_ORIGINS: csv,
    // Public URL of the frontend — used in emails (reset links, orders)
    SITE_URL: z.string().url().default('http://localhost:5173'),
    // Public URL of this API — used to build /media URLs
    API_PUBLIC_URL: z.string().url().default('http://localhost:8787'),
    // If R2 has a public bucket / custom domain, media URLs point there
    MEDIA_PUBLIC_URL: z.string().url().optional(),
    COOKIE_DOMAIN: z.string().optional(), // e.g. .circuitbay.in
    SESSION_TTL_DAYS: z.coerce.number().int().positive().default(30),
    ADMIN_EMAILS: csv, // accounts with these emails become admins
    // Cloudflare Pages deploy hook: rebuilds the site (which pulls the latest
    // catalog from this API) when an admin clicks 'Publish site changes'
    SITE_DEPLOY_HOOK_URL: z.string().url().optional(),

    // Error monitoring (optional): Sentry project DSN and a release tag
    SENTRY_DSN: z.string().url().optional(),
    RELEASE: z.string().max(64).optional(),

    // Seller details printed on GST tax invoices.
    // TODO_CLIENT: legal name, GSTIN, registered address and its state code.
    BUSINESS_LEGAL_NAME: z.string().default('CircuitBay'),
    BUSINESS_GSTIN: z
      .string()
      .regex(/^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/, 'must be a valid 15-character GSTIN')
      .optional(),
    BUSINESS_ADDRESS: z.string().default('Registered address — TODO_CLIENT'),
    BUSINESS_STATE_CODE: z.string().regex(/^\d{2}$/).optional(), // e.g. 32 = Kerala

    PAYMENTS_PROVIDER: z.enum(['razorpay', 'fake']).default('fake'),
    RAZORPAY_KEY_ID: z.string().optional(),
    RAZORPAY_KEY_SECRET: z.string().optional(),
    RAZORPAY_WEBHOOK_SECRET: z.string().optional(),

    EMAIL_PROVIDER: z.enum(['console', 'resend']).default('console'),
    EMAIL_FROM: z.string().default('CircuitBay <hello@circuitbay.in>'),
    RESEND_API_KEY: z.string().optional(),
    // Optional: keep a Resend audience in sync with the newsletter list
    RESEND_AUDIENCE_ID: z.string().optional(),

    SMS_PROVIDER: z.enum(['console', 'msg91']).default('console'),
    MSG91_AUTH_KEY: z.string().optional(),
    MSG91_OTP_TEMPLATE_ID: z.string().optional(),
  })
  .superRefine((c, ctx) => {
    const need = (cond, key, why) => {
      if (cond && !c[key]) ctx.addIssue({ code: 'custom', path: [key], message: `required ${why}` })
    }
    const razorpay = c.PAYMENTS_PROVIDER === 'razorpay'
    need(razorpay, 'RAZORPAY_KEY_ID', 'when PAYMENTS_PROVIDER=razorpay')
    need(razorpay, 'RAZORPAY_KEY_SECRET', 'when PAYMENTS_PROVIDER=razorpay')
    need(razorpay, 'RAZORPAY_WEBHOOK_SECRET', 'when PAYMENTS_PROVIDER=razorpay')
    need(c.EMAIL_PROVIDER === 'resend', 'RESEND_API_KEY', 'when EMAIL_PROVIDER=resend')
    need(c.SMS_PROVIDER === 'msg91', 'MSG91_AUTH_KEY', 'when SMS_PROVIDER=msg91')
    need(c.SMS_PROVIDER === 'msg91', 'MSG91_OTP_TEMPLATE_ID', 'when SMS_PROVIDER=msg91')
    if (c.APP_ENV === 'production' && c.PAYMENTS_PROVIDER === 'fake') {
      ctx.addIssue({ code: 'custom', path: ['PAYMENTS_PROVIDER'], message: 'fake payments are not allowed in production' })
    }
  })

export function loadConfig(env) {
  const parsed = schema.safeParse(env)
  if (!parsed.success) {
    const lines = parsed.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`)
    throw new Error(`Invalid configuration:\n${lines.join('\n')}`)
  }
  return parsed.data
}

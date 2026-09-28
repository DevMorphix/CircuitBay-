import { z } from 'zod'

// Shared field validators
export const email = z.string().trim().toLowerCase().email().max(254)
export const password = z.string().min(8, 'Use at least 8 characters.').max(200)
export const name = z.string().trim().min(1).max(120)

// Indian mobile numbers, normalised to E.164 (+91XXXXXXXXXX)
export const phone = z
  .string()
  .trim()
  .transform((v) => v.replace(/[\s()-]/g, ''))
  .transform((v) => (v.startsWith('+') ? v : v.length === 10 ? `+91${v}` : v.startsWith('91') && v.length === 12 ? `+${v}` : v))
  .refine((v) => /^\+91[6-9]\d{9}$/.test(v), 'Enter a valid 10-digit Indian mobile number.')

export const pin = z.string().trim().regex(/^\d{6}$/, 'PIN code must be 6 digits.')

export const address = z.object({
  name,
  phone,
  line1: z.string().trim().min(3).max(200),
  line2: z.string().trim().max(200).optional(),
  city: z.string().trim().min(2).max(80),
  state: z.string().trim().min(2).max(80),
  pin,
})

export const slug = z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use lowercase letters, numbers and dashes.').max(80)

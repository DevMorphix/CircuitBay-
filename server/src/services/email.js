// Transactional email. `console` logs instead of sending (dev/tests);
// `resend` sends through https://resend.com (works on Workers and Node).
export function createEmailService(config, { log = console.log } = {}) {
  const sent = [] // kept for tests / debugging in console mode

  async function send({ to, subject, text, html }) {
    if (config.EMAIL_PROVIDER === 'console') {
      sent.push({ to, subject, text })
      log(`[email] to=${to} subject="${subject}"\n${text}`)
      return
    }
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${config.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: config.EMAIL_FROM, to: [to], subject, text, html }),
    })
    if (!res.ok) throw new Error(`Email send failed: HTTP ${res.status} ${await res.text()}`)
  }

  return { send, sent }
}

// ---- templates (plain text; add HTML versions once branding is final) ----
const rupees = (paise) => `₹${(paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 0 })}`

export const emails = {
  passwordReset: (siteUrl, token) => ({
    subject: 'Reset your CircuitBay password',
    text: `Someone asked to reset your CircuitBay password.\n\nReset it here (valid for 1 hour):\n${siteUrl}/reset-password?token=${encodeURIComponent(token)}\n\nIf this wasn't you, you can ignore this email.`,
  }),
  orderConfirmed: (siteUrl, order, items) => ({
    subject: `Order ${order.id} confirmed — it's on its way to your bench`,
    text: [
      `Hi ${order.contact_name},`,
      '',
      `Thanks for your order! Here's what's coming:`,
      ...items.map((i) => `  • ${i.name} × ${i.qty} — ${rupees(i.unit_price_paise * i.qty)}`),
      '',
      `Total paid: ${rupees(order.total_paise)}`,
      '',
      `Track it: ${siteUrl}/shop/track?order=${order.id}`,
      '',
      'Create. Break. Learn.',
      '— CircuitBay',
    ].join('\n'),
  }),
  orderStatus: (siteUrl, order, status) => ({
    subject: `Order ${order.id}: ${status.replace(/_/g, ' ')}`,
    text: `Your order ${order.id} is now "${status.replace(/_/g, ' ')}".\n\nTrack it: ${siteUrl}/shop/track?order=${order.id}`,
  }),
  newSubmission: (kind, summary) => ({
    subject: `New ${kind} on CircuitBay`,
    text: summary,
  }),
}

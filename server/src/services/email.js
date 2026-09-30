// Transactional and newsletter email. `console` logs instead of sending
// (dev/tests); `resend` sends through https://resend.com (works on Workers
// and Node). Every email has an HTML version (the branded layout below) and
// a plain-text version built from the same content.
export function createEmailService(config, { log = console.log } = {}) {
  const sent = [] // kept for tests / debugging in console mode

  async function send({ to, subject, text, html, headers }) {
    if (config.EMAIL_PROVIDER === 'console') {
      sent.push({ to, subject, text, html, headers })
      log(`[email] to=${to} subject="${subject}"\n${text}`)
      return
    }
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${config.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: config.EMAIL_FROM, to: [to], subject, text, html, ...(headers ? { headers } : {}) }),
    })
    if (!res.ok) throw new Error(`Email send failed: HTTP ${res.status} ${await res.text()}`)
  }

  // Mirror a newsletter (un)subscribe into the Resend audience, so
  // broadcasts go only to people still subscribed. Off unless
  // RESEND_AUDIENCE_ID is set. Best effort: the database is the source of truth.
  const audience = []
  async function syncAudience(email, subscribed) {
    if (!config.RESEND_AUDIENCE_ID) return
    if (config.EMAIL_PROVIDER === 'console') {
      audience.push({ email, subscribed })
      return
    }
    try {
      const res = await fetch(`https://api.resend.com/audiences/${encodeURIComponent(config.RESEND_AUDIENCE_ID)}/contacts`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${config.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, unsubscribed: !subscribed }),
      })
      // Already in the audience → update it instead
      if (res.status === 409 || res.status === 422) {
        await fetch(`https://api.resend.com/audiences/${encodeURIComponent(config.RESEND_AUDIENCE_ID)}/contacts/${encodeURIComponent(email)}`, {
          method: 'PATCH',
          headers: { Authorization: `Bearer ${config.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ unsubscribed: !subscribed }),
        })
      }
    } catch (err) {
      console.error('newsletter audience sync failed', err)
    }
  }

  return { send, sent, syncAudience, audience }
}

// ------------------------------------------------------------- layout --
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const rupees = (paise) => `₹${(paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

const STATUS_LABEL = {
  placed: 'placed',
  confirmed: 'confirmed',
  packed: 'packed and ready to ship',
  shipped: 'shipped',
  out_for_delivery: 'out for delivery',
  delivered: 'delivered',
  cancelled: 'cancelled',
}

// Builds { subject, text, html } from one description of the email:
//   heading, paragraphs[], table? [{ label, value }], total?, button? { label, url },
//   after[] (paragraphs below the button), footer? (small print)
function compose({ subject, preheader, heading, paragraphs = [], table, total, button, after = [], footer }) {
  const text = [
    heading,
    '',
    ...paragraphs,
    ...(table ? ['', ...table.map((r) => `  • ${r.label} — ${r.value}`)] : []),
    ...(total ? ['', `${total.label}: ${total.value}`] : []),
    ...(button ? ['', `${button.label}: ${button.url}`] : []),
    ...(after.length ? ['', ...after] : []),
    '',
    'Create. Break. Learn.',
    '— CircuitBay',
    ...(footer ? ['', footer.text] : []),
  ].join('\n')

  const p = (s) => `<p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:#4b5265;">${esc(s)}</p>`
  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(subject)}</title></head>
<body style="margin:0;padding:0;background:#f4f8fe;font-family:Inter,Segoe UI,Arial,sans-serif;">
<span style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(preheader ?? paragraphs[0] ?? '')}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f8fe;padding:24px 12px;">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden;">
  <tr><td style="background:#0f1f45;padding:20px 28px;">
    <span style="display:inline-block;width:24px;height:24px;border-radius:6px;background:#3f7dde;vertical-align:middle;"></span>
    <span style="font-size:17px;font-weight:700;color:#ffffff;vertical-align:middle;margin-left:8px;">CircuitBay</span>
  </td></tr>
  <tr><td style="padding:28px;">
    <h1 style="margin:0 0 16px;font-size:22px;line-height:1.3;color:#08060d;">${esc(heading)}</h1>
    ${paragraphs.map(p).join('\n    ')}
    ${
      table
        ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:8px 0 16px;border-collapse:collapse;">
      ${table.map((r) => `<tr><td style="padding:8px 0;border-bottom:1px solid #e6ebf3;font-size:14px;color:#08060d;">${esc(r.label)}</td><td align="right" style="padding:8px 0;border-bottom:1px solid #e6ebf3;font-size:14px;color:#08060d;white-space:nowrap;">${esc(r.value)}</td></tr>`).join('\n      ')}
      ${total ? `<tr><td style="padding:10px 0;font-size:15px;font-weight:700;color:#08060d;">${esc(total.label)}</td><td align="right" style="padding:10px 0;font-size:15px;font-weight:700;color:#08060d;">${esc(total.value)}</td></tr>` : ''}
    </table>`
        : ''
    }
    ${button ? `<p style="margin:22px 0;"><a href="${esc(button.url)}" style="display:inline-block;background:#3269c2;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:12px 22px;border-radius:10px;">${esc(button.label)}</a></p>` : ''}
    ${after.map(p).join('\n    ')}
    <p style="margin:24px 0 0;font-size:14px;color:#08060d;font-weight:600;">Create. Break. Learn.</p>
  </td></tr>
  <tr><td style="padding:16px 28px;background:#f5f7fa;font-size:12px;line-height:1.5;color:#636b80;">
    ${footer ? esc(footer.text) + (footer.link ? ` <a href="${esc(footer.link.url)}" style="color:#3269c2;">${esc(footer.link.label)}</a>` : '') + '<br>' : ''}
    CircuitBay · Electronics, IoT &amp; robotics for students and schools
  </td></tr>
</table>
</td></tr></table>
</body></html>`

  return { subject, text, html }
}

// ----------------------------------------------------------- templates --
export const emails = {
  verifyEmail: (siteUrl, token) =>
    compose({
      subject: 'Confirm your email for CircuitBay',
      heading: 'Confirm your email',
      paragraphs: ['Tap the button to confirm this email address for your CircuitBay account. The link is valid for 24 hours.'],
      button: { label: 'Confirm my email', url: `${siteUrl}/verify-email?token=${encodeURIComponent(token)}` },
      after: ["If you didn't create a CircuitBay account, you can ignore this email."],
    }),

  passwordReset: (siteUrl, token) =>
    compose({
      subject: 'Reset your CircuitBay password',
      heading: 'Reset your password',
      paragraphs: ['Someone asked to reset the password for your CircuitBay account. The link is valid for 1 hour.'],
      button: { label: 'Choose a new password', url: `${siteUrl}/reset-password?token=${encodeURIComponent(token)}` },
      after: ["If this wasn't you, you can ignore this email — your password won't change."],
    }),

  orderConfirmed: (siteUrl, order, items) =>
    compose({
      subject: `Order ${order.id} confirmed — it's on its way to your bench`,
      heading: `Thanks, ${order.contact_name.split(' ')[0]}! Your order is confirmed.`,
      paragraphs: [`Order ${order.id}${order.invoice_no ? ` · GST invoice ${order.invoice_no}` : ''}`],
      table: [
        ...items.map((i) => ({ label: `${i.name} × ${i.qty}`, value: rupees(i.unit_price_paise * i.qty) })),
        ...(order.discount_paise ? [{ label: `Coupon ${order.coupon_code}`, value: `−${rupees(order.discount_paise)}` }] : []),
      ],
      total: { label: 'Total paid (incl. GST and shipping)', value: rupees(order.total_paise) },
      button: { label: 'Track your order', url: `${siteUrl}/shop/track?order=${order.id}` },
      after: ['Your GST invoice is on the tracking page and under My account → Orders.'],
    }),

  orderStatus: (siteUrl, order, status) =>
    compose({
      subject: `Order ${order.id}: ${status.replace(/_/g, ' ')}`,
      heading: `Your order is ${STATUS_LABEL[status] ?? status.replace(/_/g, ' ')}`,
      paragraphs: [
        `Order ${order.id} is now ${STATUS_LABEL[status] ?? status.replace(/_/g, ' ')}.`,
        ...(order.courier && order.tracking_number ? [`Courier: ${order.courier} · tracking number ${order.tracking_number}`] : []),
        ...(order.tracking_url && status !== 'delivered' ? [`Live courier tracking: ${order.tracking_url}`] : []),
      ],
      button: { label: 'Track your order', url: `${siteUrl}/shop/track?order=${order.id}` },
      after:
        status === 'delivered'
          ? [`Built something with it? Review your parts to help other builders: ${siteUrl}/account?tab=reviews`]
          : [],
    }),

  refundIssued: (siteUrl, order) =>
    compose({
      subject: `Refund for order ${order.id}`,
      heading: `We've refunded ${rupees(order.total_paise)}`,
      paragraphs: [
        `Hi ${order.contact_name}, the refund for order ${order.id} is on its way to your original payment method.`,
        'It usually reaches your account within 5–7 working days, depending on your bank.',
      ],
      button: { label: 'View order and credit note', url: `${siteUrl}/shop/track?order=${order.id}` },
      after: [`Questions? Reply to this email or visit ${siteUrl}/contact`],
    }),

  newsletterWelcome: (siteUrl, unsubscribeUrl) =>
    compose({
      subject: "You're on the CircuitBay list",
      heading: "You're on the list",
      paragraphs: ['New builds, tutorials and kit drops — once a week, no spam.'],
      button: { label: 'Read the latest tutorials', url: `${siteUrl}/blog` },
      footer: { text: "You're receiving this because you subscribed on circuitbay.in.", link: { label: 'Unsubscribe', url: unsubscribeUrl } },
    }),

  newSubmission: (kind, summary) => ({
    subject: `New ${kind} on CircuitBay`,
    text: summary,
    html: `<pre style="font:14px/1.5 system-ui,sans-serif;white-space:pre-wrap;">${esc(summary)}</pre>`,
  }),
}

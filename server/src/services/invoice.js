import { INDIAN_STATES, stateCode } from '../../../src/content/indianStates.js'
import { amountInWords } from '../lib/money.js'

// Renders a GST tax invoice as a standalone, printable HTML page (the
// browser's "Save as PDF" produces the PDF). Every figure comes from the
// order's snapshots, so an invoice never changes after it is issued.
// TODO_CLIENT: have the CA review the layout, and the GST treatment of
// shipping, before launch.

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const inr = (paise) => (paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const stateName = (code) => INDIAN_STATES.find((s) => s.code === code)?.name ?? '—'
const day = (ms) => new Date(ms).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' })

// `creditNote` (a credit_notes row) renders the credit note that reverses
// this order's invoice instead of the invoice itself.
export function renderInvoice({ order: o, items, config, creditNote: cn = null }) {
  const docTitle = cn ? 'Credit Note' : 'Tax Invoice'
  const docNo = cn ? cn.number : o.invoice_no
  const supplyCode = o.place_of_supply ?? stateCode(o.ship_state)
  const sellerCode = config.BUSINESS_STATE_CODE ?? config.BUSINESS_GSTIN?.slice(0, 2) ?? null
  // Same state → CGST + SGST (half each); otherwise IGST
  const intra = Boolean(supplyCode && sellerCode && supplyCode === sellerCode)

  const rows = items.map((i, n) => {
    // A coupon discount lowers the line's taxable value
    const disc = i.discount_paise ?? 0
    const taxable = i.unit_price_paise * i.qty - disc
    const tax = i.tax_paise ?? Math.round((taxable * (i.gst_rate ?? 18)) / 100)
    const half = Math.floor(tax / 2)
    return { n: n + 1, name: i.name, hsn: i.hsn_code, qty: i.qty, unit: i.unit_price_paise, disc, taxable, rate: i.gst_rate ?? 18, tax, cgst: intra ? half : 0, sgst: intra ? tax - half : 0, igst: intra ? 0 : tax }
  })
  const sum = (k) => rows.reduce((n, r) => n + r[k], 0)
  const hasDisc = rows.some((r) => r.disc > 0)
  const span = 6 + (hasDisc ? 1 : 0) + (intra ? 2 : 1) // columns before "Amount"

  const taxCols = intra
    ? '<th class="num">CGST</th><th class="num">SGST</th>'
    : '<th class="num">IGST</th>'
  const taxCells = (r) =>
    intra
      ? `<td class="num">${inr(r.cgst)}<small>${r.rate / 2}%</small></td><td class="num">${inr(r.sgst)}<small>${r.rate / 2}%</small></td>`
      : `<td class="num">${inr(r.igst)}<small>${r.rate}%</small></td>`

  const shipTo = [o.ship_line1, o.ship_line2, `${o.ship_city}, ${o.ship_state} ${o.ship_pin}`].filter(Boolean).map(esc).join('<br>')

  return `<!doctype html>
<html lang="en-IN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>${docTitle} ${esc(docNo)} · ${esc(config.BUSINESS_LEGAL_NAME)}</title>
<style>
  :root { --ink: #08060d; --muted: #636b80; --line: #d9dee8; --brand: #3269c2; }
  * { box-sizing: border-box; }
  body { margin: 0; background: #f4f8fe; color: var(--ink); font: 14px/1.5 system-ui, -apple-system, "Segoe UI", sans-serif; }
  .page { max-width: 820px; margin: 24px auto; background: #fff; padding: 40px; border-radius: 12px; box-shadow: 0 4px 16px rgba(15,31,69,.08); }
  header { display: flex; justify-content: space-between; gap: 24px; border-bottom: 2px solid var(--brand); padding-bottom: 16px; }
  h1 { margin: 0; font-size: 22px; } h2 { margin: 0 0 6px; font-size: 12px; text-transform: uppercase; letter-spacing: .08em; color: var(--muted); }
  .meta { text-align: right; } .meta p { margin: 2px 0; }
  .parties { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin: 24px 0; }
  table { width: 100%; border-collapse: collapse; }
  th, td { padding: 8px 6px; border-bottom: 1px solid var(--line); vertical-align: top; text-align: left; }
  th { font-size: 12px; color: var(--muted); font-weight: 600; }
  .num { text-align: right; white-space: nowrap; } small { display: block; color: var(--muted); font-size: 11px; }
  tfoot td { font-weight: 600; } .grand td { font-size: 16px; border-top: 2px solid var(--ink); }
  .words { margin: 16px 0; } .note { color: var(--muted); font-size: 12px; margin-top: 24px; }
  .actions { max-width: 820px; margin: 16px auto 0; text-align: right; }
  button { background: var(--brand); color: #fff; border: 0; border-radius: 10px; padding: 10px 18px; font-weight: 600; cursor: pointer; }
  @media print { body { background: #fff; } .page { box-shadow: none; margin: 0; max-width: none; } .actions { display: none; } }
</style>
</head>
<body>
<div class="actions"><button onclick="window.print()">Print / Save as PDF</button></div>
<main class="page">
  <header>
    <div>
      <h1>${docTitle}</h1>
      <p><strong>${esc(config.BUSINESS_LEGAL_NAME)}</strong><br>${esc(config.BUSINESS_ADDRESS)}<br>
      GSTIN: <strong>${esc(config.BUSINESS_GSTIN ?? 'Not configured')}</strong>${sellerCode ? `<br>State: ${esc(stateName(sellerCode))} (${esc(sellerCode)})` : ''}</p>
    </div>
    <div class="meta">
      ${
        cn
          ? `<p>Credit note no. <strong>${esc(cn.number)}</strong></p>
      <p>Date: ${day(cn.issued_at)}</p>
      <p>Against invoice <strong>${esc(cn.invoice_no)}</strong> dated ${day(o.invoiced_at)}</p>`
          : `<p>Invoice no. <strong>${esc(o.invoice_no)}</strong></p>
      <p>Invoice date: ${day(o.invoiced_at)}</p>`
      }
      <p>Order: #${esc(o.id)} · ${day(o.created_at)}</p>
      <p>Payment: ${esc(o.payment_id ?? '—')}</p>
    </div>
  </header>

  <section class="parties">
    <div><h2>Billed to</h2><p><strong>${esc(o.contact_name)}</strong><br>${esc(o.contact_email)}<br>${esc(o.contact_phone)}</p></div>
    <div><h2>Shipped to</h2><p>${shipTo}</p>
      <p>Place of supply: <strong>${esc(supplyCode ? `${stateName(supplyCode)} (${supplyCode})` : o.ship_state)}</strong></p></div>
  </section>

  <table>
    <thead><tr><th>#</th><th>Item</th><th>HSN</th><th class="num">Qty</th><th class="num">Rate (₹)</th>${hasDisc ? '<th class="num">Discount (₹)</th>' : ''}<th class="num">Taxable (₹)</th>${taxCols}<th class="num">Amount (₹)</th></tr></thead>
    <tbody>
      ${rows
        .map(
          (r) => `<tr><td>${r.n}</td><td>${esc(r.name)}</td><td>${esc(r.hsn ?? '—')}</td><td class="num">${r.qty}</td><td class="num">${inr(r.unit)}</td>${hasDisc ? `<td class="num">${inr(r.disc)}</td>` : ''}<td class="num">${inr(r.taxable)}</td>${taxCells(r)}<td class="num">${inr(r.taxable + r.tax)}</td></tr>`,
        )
        .join('\n      ')}
    </tbody>
    <tfoot>
      <tr><td colspan="5">Total</td>${hasDisc ? `<td class="num">${inr(sum('disc'))}</td>` : ''}<td class="num">${inr(sum('taxable'))}</td>${intra ? `<td class="num">${inr(sum('cgst'))}</td><td class="num">${inr(sum('sgst'))}</td>` : `<td class="num">${inr(sum('igst'))}</td>`}<td class="num">${inr(sum('taxable') + sum('tax'))}</td></tr>
      ${o.shipping_paise ? `<tr><td colspan="${span}">Shipping (${esc(o.shipping_method)})</td><td class="num">${inr(o.shipping_paise)}</td></tr>` : ''}
      <tr class="grand"><td colspan="${span}">${cn ? 'Credit note total' : 'Invoice total'}</td><td class="num">₹${inr(cn ? cn.total_paise : o.total_paise)}</td></tr>
    </tfoot>
  </table>

  <p class="words"><strong>Amount in words:</strong> ${esc(amountInWords(cn ? cn.total_paise : o.total_paise))}</p>
  ${hasDisc && o.coupon_code ? `<p>Discount: coupon <strong>${esc(o.coupon_code)}</strong>, allowed on the invoice before tax.</p>` : ''}
  ${cn ? `<p><strong>Reason:</strong> ${esc(cn.reason)}. This credit note reverses the full value of invoice ${esc(cn.invoice_no)}, including the tax shown.</p>` : ''}
  <p class="note">Tax is not payable on reverse charge. This is a computer-generated ${cn ? 'credit note' : 'invoice'} and does not require a signature.</p>
</main>
</body>
</html>`
}

// Shared response for every invoice endpoint (customer, guest, admin)
export async function invoiceResponse(c, order) {
  const { db, config } = c.var.svc
  if (!order.invoice_no) {
    return c.json({ error: { code: 'not_invoiced', message: 'The invoice is issued once payment is confirmed.' } }, 404)
  }
  if (config.APP_ENV === 'production' && !config.BUSINESS_GSTIN) {
    return c.json({ error: { code: 'not_configured', message: "Invoices aren't available yet. Please contact us for a copy." } }, 503)
  }
  const items = await db.all('SELECT * FROM order_items WHERE order_id = ? ORDER BY rowid', [order.id])
  c.header('Cache-Control', 'private, no-store')
  return c.html(renderInvoice({ order, items, config }))
}

// Shared response for every credit-note endpoint
export async function creditNoteResponse(c, order) {
  const { db, config } = c.var.svc
  const cn = await db.first('SELECT * FROM credit_notes WHERE order_id = ?', [order.id])
  if (!cn) {
    return c.json({ error: { code: 'no_credit_note', message: 'This order has no credit note.' } }, 404)
  }
  const items = await db.all('SELECT * FROM order_items WHERE order_id = ? ORDER BY rowid', [order.id])
  c.header('Cache-Control', 'private, no-store')
  return c.html(renderInvoice({ order, items, config, creditNote: cn }))
}

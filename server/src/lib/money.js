// Order pricing — the single source of truth for totals. Mirrors
// `summarise()` in the frontend's CartContext, in integer paise.
//
// GST model (current): catalogue prices EXCLUDE GST; tax is added at
// checkout per line at the product's GST rate. Shipping is charged without
// GST.
// TODO_CLIENT: confirm with the CA — whether prices should include GST, and
// the GST treatment of shipping — plus the free-shipping threshold and fees.
export const FREE_SHIPPING_MIN_PAISE = 999_00
export const SHIPPING_FEES_PAISE = { standard: 79_00, express: 149_00 }
export const DEFAULT_GST_RATE = 18

// Discount (paise) a coupon gives on an item subtotal, before GST.
// `coupon` is a coupons row; free_shipping coupons discount shipping instead.
export function couponDiscount(coupon, subtotalPaise) {
  if (!coupon) return 0
  if (coupon.kind === 'percent') {
    const d = Math.floor((subtotalPaise * coupon.value) / 100)
    return Math.min(d, coupon.max_discount_paise ?? d)
  }
  if (coupon.kind === 'amount') return Math.min(coupon.value, subtotalPaise)
  return 0
}

// Splits `total` across `weights` in proportion, in whole paise, so the
// parts always add up exactly (largest remainders get the spare paise).
export function allocate(total, weights) {
  const sum = weights.reduce((n, w) => n + w, 0)
  if (!total || !sum) return weights.map(() => 0)
  const exact = weights.map((w) => (total * w) / sum)
  const parts = exact.map(Math.floor)
  let spare = total - parts.reduce((n, p) => n + p, 0)
  const order = exact.map((e, i) => [e - Math.floor(e), i]).sort((a, b) => b[0] - a[0] || a[1] - b[1])
  for (const [, i] of order) {
    if (spare-- <= 0) break
    parts[i] += 1
  }
  return parts
}

// lines: [{ unitPricePaise, qty, gstRate? }], coupon: a coupons row or null.
// A coupon discount lowers each line's taxable value (so GST is charged on
// the discounted price); the free-shipping threshold uses the discounted
// subtotal.
export function priceLines(lines, shippingMethod = 'standard', coupon = null) {
  const gross = lines.map((l) => l.unitPricePaise * l.qty)
  const subtotal = gross.reduce((n, g) => n + g, 0)
  const discount = couponDiscount(coupon, subtotal)
  const shares = allocate(discount, gross)
  const priced = lines.map((l, i) => {
    const taxable = gross[i] - shares[i]
    const rate = l.gstRate ?? DEFAULT_GST_RATE
    return { ...l, grossPaise: gross[i], discountPaise: shares[i], taxablePaise: taxable, gstRate: rate, taxPaise: Math.round((taxable * rate) / 100) }
  })
  const tax = priced.reduce((n, l) => n + l.taxPaise, 0)
  const net = subtotal - discount
  let shipping = SHIPPING_FEES_PAISE[shippingMethod] ?? SHIPPING_FEES_PAISE.standard
  if ((shippingMethod === 'standard' && net >= FREE_SHIPPING_MIN_PAISE) || subtotal === 0 || coupon?.kind === 'free_shipping') shipping = 0
  return { lines: priced, subtotal, discount, shipping, tax, total: net + shipping + tax }
}

// Single-rate shortcut (all lines at the default rate)
export function priceOrder(subtotalPaise, shippingMethod = 'standard') {
  const { lines: _lines, ...totals } = priceLines([{ unitPricePaise: subtotalPaise, qty: 1 }], shippingMethod)
  return totals
}

export const rupeesToPaise = (rupees) => Math.round(Number(rupees) * 100)

// Indian financial year (April–March, IST) for a timestamp, e.g. '26-27'
export function financialYear(ms = Date.now()) {
  const ist = new Date(ms + 5.5 * 3_600_000)
  const y = ist.getUTCFullYear() % 100
  const start = ist.getUTCMonth() >= 3 ? y : (y + 99) % 100
  return `${String(start).padStart(2, '0')}-${String((start + 1) % 100).padStart(2, '0')}`
}

// "Rupees One Thousand Four Hundred Ninety-Nine and Paise Fifty Only"
const ONES = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen']
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']
function below100(n) {
  return n < 20 ? ONES[n] : TENS[Math.floor(n / 10)] + (n % 10 ? `-${ONES[n % 10]}` : '')
}
function below1000(n) {
  const h = Math.floor(n / 100)
  const r = n % 100
  return [h ? `${ONES[h]} Hundred` : '', r ? below100(r) : ''].filter(Boolean).join(' ')
}
function indianWords(n) {
  if (n === 0) return 'Zero'
  const parts = []
  const crore = Math.floor(n / 1e7)
  const lakh = Math.floor((n % 1e7) / 1e5)
  const thousand = Math.floor((n % 1e5) / 1e3)
  const rest = n % 1e3
  if (crore) parts.push(`${indianWords(crore)} Crore`)
  if (lakh) parts.push(`${below100(lakh)} Lakh`)
  if (thousand) parts.push(`${below100(thousand)} Thousand`)
  if (rest) parts.push(below1000(rest))
  return parts.join(' ')
}
export function amountInWords(paise) {
  const rupees = Math.floor(paise / 100)
  const p = paise % 100
  return `Rupees ${indianWords(rupees)}${p ? ` and Paise ${below100(p)}` : ''} Only`
}

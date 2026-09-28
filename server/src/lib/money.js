// Order pricing — the single source of truth for totals. Mirrors
// `summarise()` in the frontend's CartContext, but in integer paise.
// TODO_CLIENT: confirm free-shipping threshold, fees and GST treatment.
export const FREE_SHIPPING_MIN_PAISE = 999_00
export const SHIPPING_FEES_PAISE = { standard: 79_00, express: 149_00 }
export const GST_RATE = 0.18

export function priceOrder(subtotalPaise, shippingMethod = 'standard') {
  let shipping = SHIPPING_FEES_PAISE[shippingMethod] ?? SHIPPING_FEES_PAISE.standard
  if (shippingMethod === 'standard' && subtotalPaise >= FREE_SHIPPING_MIN_PAISE) shipping = 0
  if (subtotalPaise === 0) shipping = 0
  const tax = Math.round(subtotalPaise * GST_RATE)
  return { subtotal: subtotalPaise, shipping, tax, total: subtotalPaise + shipping + tax }
}

export const rupeesToPaise = (rupees) => Math.round(Number(rupees) * 100)

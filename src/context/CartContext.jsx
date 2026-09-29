import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { getProduct } from '../content/shopData.js'

// Front-end-only cart (no backend yet). Persisted to localStorage so it
// survives reloads; every storage call is guarded because it can throw in
// private mode / with blocked site data.
const STORAGE_KEY = 'cb_cart'
const CartContext = createContext(null)

function readStored() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed.filter((l) => getProduct(l.id)) : []
  } catch {
    return []
  }
}

export function CartProvider({ children }) {
  const [lines, setLines] = useState(readStored)

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(lines))
    } catch {
      // storage unavailable — cart just won't persist
    }
  }, [lines])

  const value = useMemo(() => {
    const add = (id, qty = 1) =>
      setLines((prev) => {
        const found = prev.find((l) => l.id === id)
        return found
          ? prev.map((l) => (l.id === id ? { ...l, qty: l.qty + qty } : l))
          : [...prev, { id, qty }]
      })
    const setQty = (id, qty) =>
      setLines((prev) =>
        qty <= 0 ? prev.filter((l) => l.id !== id) : prev.map((l) => (l.id === id ? { ...l, qty } : l)),
      )
    const remove = (id) => setLines((prev) => prev.filter((l) => l.id !== id))
    const clear = () => setLines([])

    const items = lines.map((l) => ({ ...l, product: getProduct(l.id) }))
    const count = lines.reduce((n, l) => n + l.qty, 0)
    const subtotal = items.reduce((n, l) => n + l.qty * l.product.price, 0)

    return { items, count, subtotal, add, setQty, remove, clear }
  }, [lines])

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

// eslint-disable-next-line react/only-export-components
export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used inside <CartProvider>')
  return ctx
}

// Estimated totals for the cart and checkout summary. Mirrors priceLines()
// in server/src/lib/money.js: in paise, GST per line at each product's rate,
// so rounding matches. The server's totals are final and replace this once
// checkout starts.
// eslint-disable-next-line react/only-export-components
export function summarise(items, shippingMethod = 'standard') {
  let sub = 0
  let tax = 0
  for (const l of items) {
    const taxable = Math.round(l.product.price * 100) * l.qty
    sub += taxable
    tax += Math.round((taxable * (l.product.gstRate ?? 18)) / 100)
  }
  let ship = shippingMethod === 'express' ? 149_00 : 79_00
  if ((shippingMethod === 'standard' && sub >= 999_00) || sub === 0) ship = 0
  return { subtotal: sub / 100, shipping: ship / 100, tax: tax / 100, total: (sub + ship + tax) / 100 }
}

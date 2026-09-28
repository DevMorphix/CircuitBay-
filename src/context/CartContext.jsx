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

// Shared order-summary maths (cart + checkout). TODO_CLIENT: confirm
// shipping threshold/fee and GST handling.
// eslint-disable-next-line react/only-export-components
export function summarise(subtotal) {
  const shipping = subtotal === 0 || subtotal >= 999 ? 0 : 79
  const tax = Math.round(subtotal * 0.18)
  return { subtotal, shipping, tax, total: subtotal + shipping + tax }
}

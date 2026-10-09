import { useEffect, useState } from 'react'
import { api } from './api.js'

// Product photos straight from the API, so a photo uploaded in /admin shows
// on the site at once instead of after the next "Publish site changes".
// Prerendered pages show the build-time catalog's photos first; one shared
// request per page load then swaps in the live ones.

const MAX_AGE_MS = 60_000 // refetch after this, e.g. back from /admin in the same tab
let pending = null // Promise<Map<id, images[]>>, shared by every caller
let loadedAt = 0

function loadAll() {
  if (pending && Date.now() - loadedAt > MAX_AGE_MS) pending = null
  if (!pending) loadedAt = Date.now()
  pending ??= (async () => {
    const byId = new Map()
    for (let page = 1; page <= 10; page++) {
      const res = await api.get(`/products?limit=48&page=${page}`)
      for (const p of res.products) byId.set(p.id, p.images ?? [])
      if (page >= (res.pages ?? 1)) break
    }
    return byId
  })().catch(() => {
    pending = null // offline or API down: keep the catalog photos, retry on next mount
    return null
  })
  return pending
}

// A function giving any product's live photos, or its catalog photos until
// (or unless) they load. For lists, where a hook per item isn't possible.
export function useLiveImages() {
  const [live, setLive] = useState(null)
  useEffect(() => {
    let cancelled = false
    loadAll().then((byId) => !cancelled && byId && setLive(byId))
    return () => {
      cancelled = true
    }
  }, [])
  return (product) => {
    const images = product && live?.get(product.id)
    return images?.length ? images : (product?.images ?? [])
  }
}

export function useProductImages(product) {
  return useLiveImages()(product)
}

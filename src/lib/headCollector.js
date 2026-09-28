import { createContext } from 'react'

// Build-time only: scripts/prerender.js provides a collector through this
// context and <Seo> hands it the page's head via `collector.set(head)`.
export const HeadCollector = createContext(null)

export function createHeadCollector() {
  let head = null
  return {
    set: (h) => {
      head = h
    },
    get: () => head,
  }
}

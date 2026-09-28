import { useSyncExternalStore } from 'react'

// Pages are prerendered to HTML at build time and then hydrated in the
// browser. Anything that depends on browser-only state (localStorage,
// matchMedia) must render the *server* version during hydration and switch
// after — useSyncExternalStore does exactly that.
const noopSubscribe = () => () => {}

// false during prerender + hydration, true afterwards
export function useHydrated() {
  return useSyncExternalStore(noopSubscribe, () => true, () => false)
}

// True from page load until the first client-side navigation. Reveal uses
// it to show prerendered content immediately (better LCP/CLS) and only
// animate content on pages the visitor navigates to later.
let initialPage = true
export const isInitialPage = () => import.meta.env.SSR || initialPage
export const markNavigated = () => {
  initialPage = false
}

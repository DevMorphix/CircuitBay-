import { createContext } from 'react'

// When true (the home page), <Reveal> is scroll-linked: it plays forward as
// its element scrolls into view and rewinds as it scrolls back out.
export const ScrollRevealContext = createContext(false)

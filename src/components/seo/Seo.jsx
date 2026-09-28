import { useContext, useEffect } from 'react'
import { buildHead } from '../../lib/seo.js'
import { HeadCollector } from '../../lib/headCollector.js'

// During prerendering, <Seo> hands the page's head to the collector from
// context (scripts/prerender.js writes it into the HTML). In the browser
// there is no collector and <Seo> updates <head> on every navigation.
export function Seo(props) {
  const collector = useContext(HeadCollector)
  const head = buildHead(props)
  collector?.set(head)

  const key = JSON.stringify(head)
  useEffect(() => applyHead(JSON.parse(key)), [key])
  return null
}

// Replace every tag we own (marked data-seo, including the prerendered
// ones) with this page's set.
function applyHead(head) {
  document.title = head.title
  document.head.querySelectorAll('[data-seo]:not(title)').forEach((el) => el.remove())
  const add = (tag, attrs, text) => {
    const el = document.createElement(tag)
    el.setAttribute('data-seo', '')
    for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
    if (text) el.textContent = text
    document.head.appendChild(el)
  }
  head.meta.forEach((m) => add('meta', m))
  head.links.forEach((l) => add('link', l))
  head.jsonLd.forEach((j) => add('script', { type: 'application/ld+json' }, JSON.stringify(j)))
}

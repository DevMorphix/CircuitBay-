import { Icon } from '../ui/Icon.jsx'

// Accessible accordion of questions. Answers are always in the HTML (native
// <details>), so crawlers and the FAQPage schema see the same text.
export function FaqList({ items, openAll = false, dark = false }) {
  return (
    <div className={`${dark ? 'card card-dark' : 'card'} divide-y ${dark ? 'divide-white/10' : 'divide-black/5'}`}>
      {items.map((item) => (
        <details key={`${item.q}-${openAll}`} className="group/faq" open={openAll}>
          <summary
            className={`flex cursor-pointer list-none items-center justify-between gap-4 p-5 font-semibold [&::-webkit-details-marker]:hidden ${
              dark ? 'text-white hover:text-brand-300' : 'text-ink-900 hover:text-brand-600'
            }`}
          >
            {item.q}
            <Icon name="chevron" size={20} className={`shrink-0 transition-transform group-open/faq:rotate-180 ${dark ? 'text-brand-300' : 'text-brand-500'}`} />
          </summary>
          <p className={`px-5 pb-5 text-sm leading-relaxed ${dark ? 'text-white/70' : 'text-ink-600'}`}>{item.a}</p>
        </details>
      ))}
    </div>
  )
}

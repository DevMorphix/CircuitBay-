import { trustItems } from '../../content/shopData.js'
import { Icon } from '../ui/Icon.jsx'

export function TrustStrip({ dark = false }) {
  return (
    <ul className="grid grid-cols-2 gap-4 md:grid-cols-4">
      {trustItems.map((t) => (
        <li
          key={t.label}
          className={`flex items-center gap-3 rounded-xl p-4 ${dark ? 'bg-white/5 text-white' : 'bg-white text-ink-900 shadow-sm'}`}
        >
          <span className={dark ? 'text-brand-300' : 'text-brand-500'}>
            <Icon name={t.icon} />
          </span>
          <span className="text-sm font-semibold">{t.label}</span>
        </li>
      ))}
    </ul>
  )
}

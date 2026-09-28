import { Link } from 'react-router-dom'
import { brand, footer } from '../../content/siteContent.js'
import { Icon } from '../ui/Icon.jsx'
import { Logo } from './Logo.jsx'
import { NewsletterForm } from '../ui/NewsletterForm.jsx'

export function Footer() {
  return (
    <footer className="section-dark px-4 pb-10 pt-16 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-12 lg:grid-cols-[1.2fr_2fr]">
          <div>
            <Logo dark />
            <p className="mt-4 max-w-xs text-sm text-white/65">{brand.tagline}</p>
            <p className="mt-6 text-sm font-semibold text-white">New builds and tutorials, once a week.</p>
            <NewsletterForm className="mt-3 max-w-sm" source="footer" />
            <ul className="mt-6 flex gap-2">
              {footer.social.map((s) => (
                <li key={s.label}>
                  <a
                    href={s.href}
                    aria-label={s.label}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 text-white/70 transition-colors hover:border-brand-300/60 hover:text-white"
                  >
                    <Icon name={s.icon} size={20} />
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 lg:grid-cols-5">
            {footer.columns.map((col) => (
              <div key={col.title}>
                <h3 className="mb-4 text-sm font-semibold text-white">{col.title}</h3>
                <ul className="space-y-2.5 text-sm">
                  {col.links.map((l) => (
                    <li key={l.label}>
                      <Link to={l.to} className="text-white/60 transition-colors hover:text-white">
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-14 flex flex-col gap-3 border-t border-white/10 pt-6 text-xs text-white/45 sm:flex-row sm:justify-between">
          <span>
            © {new Date().getFullYear()} {brand.name}. All rights reserved.
          </span>
          <span className="font-heading tracking-wide text-brand-300">{brand.motto.join(' ')}</span>
        </div>
      </div>
    </footer>
  )
}

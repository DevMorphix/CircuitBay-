import { Reveal } from './Reveal.jsx'

const TONES = {
  light: 'section-light',
  soft: 'section-soft',
  grey: 'section-grey',
  dark: 'section-dark',
}

// Every section on every page goes through this, so backgrounds, text
// colours, spacing and the header block stay identical site-wide. Pages
// alternate tones (dark → light → dark) so they breathe.
export function Section({
  tone = 'light',
  id,
  eyebrow,
  title,
  subtitle,
  align = 'left',
  width = 'max-w-6xl',
  snap = false,
  className = '',
  headerAside,
  children,
}) {
  const dark = tone === 'dark'
  const centered = align === 'center'

  return (
    <section
      id={id}
      className={`${TONES[tone]} ${snap ? 'snap-start' : ''} scroll-mt-20 px-4 py-20 sm:px-6 md:py-24 ${className}`}
    >
      <div className={`mx-auto w-full ${width}`}>
        {(eyebrow || title || subtitle) && (
          <Reveal
            className={`mb-12 flex flex-col gap-6 md:flex-row md:items-end md:justify-between ${
              centered ? 'items-center text-center md:flex-col md:items-center' : ''
            }`}
          >
            <div className={centered ? 'mx-auto max-w-2xl' : 'max-w-2xl'}>
              {eyebrow && <p className="eyebrow mb-4">{eyebrow}</p>}
              {title && (
                <h2
                  className={`font-heading text-3xl font-semibold tracking-tight sm:text-4xl ${
                    dark ? 'text-white' : 'text-ink-900'
                  }`}
                >
                  {title}
                </h2>
              )}
              {subtitle && (
                <p className={`mt-4 text-base leading-relaxed sm:text-lg ${dark ? 'text-white/70' : 'text-ink-600'}`}>
                  {subtitle}
                </p>
              )}
            </div>
            {headerAside}
          </Reveal>
        )}
        {children}
      </div>
    </section>
  )
}

// Page-level hero band used at the top of every inner page (blog, shop,
// about...). Always dark so each page opens the same way.
export function PageHero({ eyebrow, title, subtitle, children, align = 'left', compact = false }) {
  return (
    <section className={`section-dark px-4 pb-16 sm:px-6 md:pb-20 ${compact ? 'pt-14 md:pt-16' : 'pt-32 md:pt-36'}`}>
      <div className={`mx-auto max-w-6xl ${align === 'center' ? 'text-center' : ''}`}>
        <Reveal className={align === 'center' ? 'mx-auto max-w-3xl' : 'max-w-3xl'}>
          {eyebrow && <div className="eyebrow mb-4">{eyebrow}</div>}
          <h1 className="font-heading text-4xl font-semibold tracking-tight text-white sm:text-5xl">
            {title}
          </h1>
          {subtitle && <p className="mt-5 text-base leading-relaxed text-white/70 sm:text-lg">{subtitle}</p>}
        </Reveal>
        {children}
      </div>
    </section>
  )
}

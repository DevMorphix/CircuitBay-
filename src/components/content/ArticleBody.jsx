import { Link } from 'react-router-dom'
import { Photo } from '../ui/Card.jsx'
import { parseInline, safeHref, stripInline } from '../../lib/markdown.js'

// Renders an article's blocks (the blog page and the admin editor preview).
// Text may contain inline Markdown: **bold**, *italic*, `code`, [links](…).
export function ArticleBody({ blocks }) {
  return blocks.map((b, i) => <Block key={i} block={b} />)
}

export function Inline({ text }) {
  return parseInline(text).map((t, i) => {
    switch (t.type) {
      case 'strong':
        return (
          <strong key={i} className="font-semibold text-ink-900">
            {t.text}
          </strong>
        )
      case 'em':
        return <em key={i}>{t.text}</em>
      case 'code':
        return (
          <code key={i} className="rounded bg-surface-soft px-1.5 py-0.5 font-mono text-[0.9em] text-ink-900">
            {t.text}
          </code>
        )
      case 'link':
        return t.href.startsWith('/') ? (
          <Link key={i} to={t.href} className="font-medium text-brand-700 underline underline-offset-2 hover:text-brand-600">
            {t.text}
          </Link>
        ) : (
          <a
            key={i}
            href={t.href}
            className="font-medium text-brand-700 underline underline-offset-2 hover:text-brand-600"
            {...(t.href.startsWith('http') ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
          >
            {t.text}
          </a>
        )
      default:
        return t.text
    }
  })
}

function Block({ block }) {
  switch (block.type) {
    case 'h2':
      return (
        <h2 id={block.id} className="mt-12 scroll-mt-28 font-heading text-2xl font-semibold text-ink-900 first:mt-0">
          {stripInline(block.text)}
        </h2>
      )
    case 'code':
      return (
        <pre className="mt-5 overflow-x-auto rounded-xl bg-navy-950 p-5 text-sm leading-relaxed text-brand-100">
          <code>{block.text}</code>
        </pre>
      )
    case 'list': {
      const List = block.ordered ? 'ol' : 'ul'
      return (
        <List className={`mt-5 ${block.ordered ? 'list-decimal' : 'list-disc'} space-y-2 pl-6 text-base leading-[1.7] text-ink-600 marker:text-brand-500`}>
          {block.items.map((item, i) => (
            <li key={i}>
              <Inline text={item} />
            </li>
          ))}
        </List>
      )
    }
    case 'table':
      return (
        <div className="mt-6 overflow-x-auto rounded-xl border border-black/10">
          <table className="w-full min-w-[520px] border-collapse text-left text-sm">
            <thead className="bg-surface-soft">
              <tr>
                {block.head.map((h, i) => (
                  <th key={i} scope="col" className="px-4 py-3 font-semibold text-ink-900">
                    <Inline text={h} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {block.rows.map((row, r) => (
                <tr key={r}>
                  {row.map((cell, i) =>
                    i === 0 ? (
                      <th key={i} scope="row" className="px-4 py-3 font-semibold text-ink-900">
                        <Inline text={cell} />
                      </th>
                    ) : (
                      <td key={i} className="px-4 py-3 text-ink-600">
                        <Inline text={cell} />
                      </td>
                    ),
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )
    case 'image': {
      const src = safeHref(block.src ?? '')
      if (!src) return <Photo label={block.text} className="mt-6 aspect-[16/9] rounded-xl" />
      return (
        <figure className="mt-6">
          <img src={src} alt={block.text ?? ''} loading="lazy" decoding="async" className="w-full rounded-xl border border-black/5" />
          {block.text && <figcaption className="mt-2 text-center text-sm text-ink-400">{block.text}</figcaption>}
        </figure>
      )
    }
    case 'diagram':
      // TODO_CLIENT: real wiring diagram
      return <Photo label={block.text} className="mt-6 aspect-[16/9] rounded-xl" />
    default:
      return (
        <p className="mt-5 text-base leading-[1.8] text-ink-600">
          <Inline text={block.text} />
        </p>
      )
  }
}

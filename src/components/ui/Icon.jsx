// One consistent line-icon set for the whole site: 24px grid, 1.6 stroke,
// round caps, drawn in `currentColor` (brand blue by default).
// TODO_CLIENT: swap for the final brand icon set once supplied.
const PATHS = {
  robotics:
    'M12 2v3M8 8h8a2 2 0 0 1 2 2v6a4 4 0 0 1-4 4h-4a4 4 0 0 1-4-4v-6a2 2 0 0 1 2-2Zm2 5h.01M14 13h.01',
  electronics:
    'M9 3v4M15 3v4M9 17v4M15 17v4M3 9h4M3 15h4M17 9h4M17 15h4M9 7h6a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2Z',
  iot: 'M12 18a1 1 0 1 0 0-2 1 1 0 0 0 0 2Zm-3.5-2.5a5 5 0 0 1 7 0M6 12a9 9 0 0 1 12 0M12 22c-4-3-7-6.5-7-11a7 7 0 0 1 14 0c0 4.5-3 8-7 11Z',
  ai: 'M9 3h6l1 3h2a1 1 0 0 1 1 1v11a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V7a1 1 0 0 1 1-1h2l1-3ZM9 12h.01M15 12h.01M9 16c1 1 5 1 6 0',
  'maker-tools':
    'm14.5 3.5 6 6-2 2-6-6 2-2ZM3 21l6.2-2.1a2 2 0 0 0 .95-.55l7.1-7.1-4-4-7.1 7.1a2 2 0 0 0-.55.95L3 21Z',
  kit: 'm3.5 8 8.5-4.5L20.5 8 12 12.5 3.5 8Zm0 0v8L12 20.5m0-8v8m8.5-12v8L12 20.5',
  support: 'M4 13v-1a8 8 0 0 1 16 0v1M4 13a2 2 0 0 0 2 2h1v-5H6a2 2 0 0 0-2 2Zm16 0a2 2 0 0 1-2 2h-1v-5h1a2 2 0 0 1 2 2Zm-3 2v1a4 4 0 0 1-4 4h-1',
  marketplace: 'M4 7h16l-1.5 9a2 2 0 0 1-2 1.7h-9a2 2 0 0 1-2-1.7L4 7Zm4 0V6a4 4 0 0 1 8 0v1',
  search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14Zm5-2 4.5 4.5',
  book: 'M4 5a2 2 0 0 1 2-2h12v16H6a2 2 0 0 0-2 2V5Zm0 16a2 2 0 0 1 2-2h12v2M8 7h6',
  trophy: 'M8 4h8v5a4 4 0 0 1-8 0V4Zm0 2H5a3 3 0 0 0 3 4m8-4h3a3 3 0 0 1-3 4m-4 3v4m-4 3h8l-1-3H9l-1 3Z',
  workshop: 'M3 5h18v11H3V5Zm5 15h8m-4-4v4M7 12l3-3 2 2 4-4',
  lab: 'M9 3h6M10 3v6l-5 9a2 2 0 0 0 1.8 3h10.4a2 2 0 0 0 1.8-3l-5-9V3M7.5 14h9',
  curriculum: 'M5 4h14v16H5V4Zm4 4h6M9 12h6M9 16h3',
  teacher: 'M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 10a7 7 0 0 1 14 0',
  play: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm-2-12.5 5 3.5-5 3.5v-7Z',
  bolt: 'M13 2 4 14h7l-1 8 9-12h-7l1-8Z',
  users: 'M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 10a7 7 0 0 1 14 0m1-10a3 3 0 1 0 0-6m2 16h3a6 6 0 0 0-4-5.6',
  cart: 'M3 4h2l2.4 11.2a2 2 0 0 0 2 1.6h7.7a2 2 0 0 0 2-1.5L21 8H6.2M10 21h.01M17 21h.01',
  shield: 'M12 3 4 6v6c0 4.5 3.4 8.3 8 9 4.6-.7 8-4.5 8-9V6l-8-3Zm-3 9 2 2 4-4',
  truck: 'M3 6h11v10H3V6Zm11 4h4l3 3v3h-7v-6ZM7 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4Zm10 0a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z',
  return: 'M9 14 4 9l5-5M4 9h11a5 5 0 0 1 0 10h-3',
  chat: 'M4 5h16v11H8l-4 4V5Zm4 5h8',
  heart: 'M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z',
  user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 9a7 7 0 0 1 14 0',
  pin: 'M12 21s-7-6.2-7-12a7 7 0 0 1 14 0c0 5.8-7 12-7 12Zm0-9a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z',
  box: 'm3.5 8 8.5-4.5L20.5 8 12 12.5 3.5 8Zm0 0v8L12 20.5m0-8v8m8.5-12v8L12 20.5',
  check: 'm5 12 5 5 9-10',
  arrow: 'M5 12h14m-5-5 5 5-5 5',
  menu: 'M4 7h16M4 12h16M4 17h16',
  close: 'M6 6l12 12M18 6 6 18',
  plus: 'M12 5v14M5 12h14',
  minus: 'M5 12h14',
  chevron: 'm6 9 6 6 6-6',
  mail: 'M3 6h18v12H3V6Zm0 0 9 7 9-7',
  tag: 'M3 12V4a1 1 0 0 1 1-1h8l9 9-9 9-9-9Zm5-4h.01',
  phone: 'M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2Z',
  clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0-13v5l3 2',
  star: 'm12 3 2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.3 6.5 20.2l1-6.2L3 9.6l6.2-.9L12 3Z',
  filter: 'M4 5h16l-6 7v6l-4 2v-8L4 5Z',
  code: 'm8 8-4 4 4 4m8-8 4 4-4 4m-2-12-4 16',
  instagram: 'M7 3h10a4 4 0 0 1 4 4v10a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V7a4 4 0 0 1 4-4Zm5 13a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm5-9.5h.01',
  youtube: 'M3 8a3 3 0 0 1 3-3h12a3 3 0 0 1 3 3v8a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V8Zm7 1v6l5-3-5-3Z',
  discord: 'M8 7a14 14 0 0 1 8 0l1 1c1.5 2.5 2.3 5 2 8-1.3 1-2.7 1.6-4 2l-1-2m-4 0-1 2c-1.3-.4-2.7-1-4-2-.3-3 .5-5.5 2-8l1-1m1 7h.01M15 12h.01',
  linkedin: 'M4 4h16v16H4V4Zm4 6v6m0-8.5v.01M12 16v-3.5a2 2 0 0 1 4 0V16m-4-6v6',
}

export function Icon({ name, size = 24, className = '', strokeWidth = 1.6, ...rest }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
      {...rest}
    >
      <path d={PATHS[name] ?? PATHS.box} />
    </svg>
  )
}

// Rounded tinted tile holding an icon — the standard feature-card icon.
export function IconTile({ name, dark = false, className = '' }) {
  return (
    <span
      className={`inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-110 ${
        dark ? 'bg-brand-300/15 text-brand-300' : 'bg-brand-500/10 text-brand-500'
      } ${className}`}
    >
      <Icon name={name} />
    </span>
  )
}

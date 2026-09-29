// ---------------------------------------------------------------------------
// SITE COPY — DRAFT, PENDING CLIENT SIGN-OFF
// ---------------------------------------------------------------------------
// Every string in this file is placeholder/draft copy written to fill the
// approved layout (see full-project.md). Nothing here should ship without the
// client's sign-off. Fields that need a real number, name, or asset from the
// client (not just wordsmithing) are flagged `TODO_CLIENT` in a comment.
// ---------------------------------------------------------------------------

import projectsData from './data/projects.js'

export const brand = {
  name: 'CircuitBay',
  tagline: 'Technology understood when built.',
  motto: ['Create.', 'Break.', 'Learn.'],
  shopUrl: 'https://shop.circuitbay.in',
  communityUrl: 'https://community.circuitbay.in',
}

// Main-site nav (Part E). `to` = internal route.
export const nav = [
  { label: 'Shop', to: '/shop' },
  { label: 'Learn', to: '/blog' },
  { label: 'Community', to: '/projects' },
  { label: 'For Schools', to: '/schools' },
  { label: 'About', to: '/about' },
]

export const spark = {
  // Rendered inside the H1 — carries the page's main keywords
  eyebrow: 'Electronics, IoT & robotics kits for students and schools',
  headline: 'Every build starts with a spark.',
  subcopy:
    'From a loose idea to a working prototype — CircuitBay is the place makers open the box, wire it up, and ship something real.',
  ctaPrimary: 'Start Building',
  ctaSecondary: 'Explore the Bay',
}

export const gap = {
  kicker: '01 — THE GAP',
  headline: "Between the idea and the build, there's a gap.",
  body:
    "Tutorials that assume too much. Parts that don't arrive together. No one to ask at 11pm when the board won't boot. Most people stall right here — not for lack of curiosity, but for lack of a path.",
}

export const turn = {
  kicker: '02 — THE TURN',
  headline: "That's the gap CircuitBay closes.",
  body:
    'Curated kits, guided builds, and a community that answers in minutes, not days. We hand you the missing wire — the trace reconnects, and the build moves again.',
}

export const ship = {
  kicker: '03 — ON ITS WAY',
  headline: 'Packed today. Moving within hours.',
  body:
    "Every order leaves the bay boxed, labelled, and tracked — the same kit, the same components, the same box you saw come together above. No surprises when it lands on your bench.",
}

export const delivered = {
  kicker: '04 — DELIVERED',
  headline: 'The box is yours. Time to open it.',
  body:
    'From our bay to your doorstep — wherever your bench is. Everything past this point is the fun part.',
  ctaPrimary: 'Start Building',
  ctaSecondary: 'See what ships',
}

// Drives the scroll-synced frame sequence in `StoryReel` — maps each
// narrative beat to the slice of scroll progress (0–1 across the reel) it
// owns and the slice of the 40-frame shot it should show. Both sets of
// ranges were picked by eye against the source frames: components float
// through ~frame 9, the branded box holds from ~9–19, the van is in transit
// ~19–29, and it's parked outside / handing off the box ~29–40.
export const story = {
  frameCount: 40,
  framePath: (n) => `/hero/frames/frame_${String(n).padStart(3, '0')}.webp`,
  chapters: [
    { id: 'spark', content: spark, kind: 'hero', progress: [0, 0.225], align: 'left' },
    { id: 'gap', content: gap, kind: 'beat', progress: [0.225, 0.35], align: 'center' },
    { id: 'turn', content: turn, kind: 'beat', progress: [0.35, 0.475], align: 'center' },
    { id: 'ship', content: ship, kind: 'beat', progress: [0.475, 0.725], align: 'left' },
    { id: 'delivered', content: delivered, kind: 'closer', progress: [0.725, 1], align: 'center' },
  ],
}

// ---------------------------------------------------------------------------
// HOME — sections after the scroll reel (Part A)
// ---------------------------------------------------------------------------

export const whoWeAre = {
  eyebrow: 'WHO WE ARE',
  headline: 'A bay for people who build.',
  body: [
    'CircuitBay is a maker community and hardware store for students, hobbyists and educators across India.',
    'We supply the right components, the guidance to use them, and a community to build alongside.',
  ],
  supporting: 'Born from years of teaching electronics, IoT and AI in real classrooms.',
  cta: { label: 'Our story', to: '/about' },
  photoLabel: 'Founder with students at a workshop', // TODO_CLIENT: real photo
}

export const beliefs = {
  eyebrow: 'WHAT WE BELIEVE IN',
  quote: "Technology isn't understood by looking at it. It's understood when you build it.",
  cards: [
    { icon: 'play', title: 'Making should feel like play', body: 'No gatekeeping, no fear of mistakes.' },
    { icon: 'bolt', title: 'Break it. Learn from it.', body: 'Every failed circuit is a lesson.' },
    { icon: 'users', title: 'Nobody builds alone', body: 'The right parts, the right guidance, a place to belong.' },
  ],
}

export const students = {
  eyebrow: 'FOR STUDENTS',
  headline: 'From first LED to final-year project.',
  subhead: 'Everything you need to go from an idea to a working build.',
  cards: [
    { icon: 'support', title: 'Project Support', body: "Stuck on wiring or code? Get guidance from people who've built it before.", link: 'Get help', to: '/contact' },
    { icon: 'marketplace', title: 'IoT Marketplace', body: 'Ready-to-build IoT parts and kits, picked for students.', link: 'Browse the shop', to: '/shop' },
    { icon: 'search', title: 'Component Sourcing', body: "Can't find a part? Tell us. We'll source it.", link: 'Request a part', to: '/request-a-part' },
    { icon: 'book', title: 'Learning Resources', body: 'Tutorials, datasheets explained, step-by-step builds.', link: 'Start learning', to: '/blog' },
    { icon: 'trophy', title: 'Competition Mentoring', body: "Preparing for a hackathon or science fair? We'll mentor your team.", link: 'See project ideas', to: '/final-year-projects' },
  ],
  banner: { prompt: 'Have a project idea?', cta: 'Start building', to: '/shop' },
}

export const educators = {
  eyebrow: 'FOR EDUCATORS & INSTITUTIONS',
  headline: 'Bring a maker lab to your school.',
  subhead: 'Workshops, labs and curriculum that get students building, not just reading.',
  cards: [
    { icon: 'workshop', title: 'IoT & AI Workshops', body: 'Hands-on sessions, from beginner to advanced.' },
    { icon: 'lab', title: 'Maker Lab Setup', body: 'We plan, equip and launch your lab.' },
    { icon: 'curriculum', title: 'STREAM Curriculum', body: 'Project-based lessons that fit your timetable.' },
    { icon: 'teacher', title: 'Teacher Training', body: 'Confident teachers make confident builders.' },
  ],
  // TODO_CLIENT: real workshop count (e.g. '50+ workshops') + school/college
  // logo image paths. The trust strips stay hidden while these are empty —
  // we don't show invented numbers or placeholder logos.
  trust: { stat: null, logos: [] },
  cta: { label: 'Request a workshop', to: '/contact#workshop' },
  ctaMore: { label: 'Lab setup & ATL packages', to: '/schools' },
}

// Community projects live in data/projects.js (pulled from the API at build time)
export const projects = projectsData

export const featuredProjects = {
  eyebrow: 'COMMUNITY',
  headline: 'Built by people like you.',
  ctaAll: { label: 'See all projects', to: '/projects' },
  ctaShare: { label: 'Share yours', to: '/projects#submit' },
}

export const featuredBlogs = {
  eyebrow: 'LEARN',
  headline: 'Read a little. Build a lot.',
  cta: { label: 'All articles', to: '/blog' },
}

export const closingCta = {
  headline: 'Your idea is waiting.',
  primary: { label: 'EXPLORE THE BAY', to: '/shop' },
  secondary: { label: 'START BUILDING', to: '/blog' },
}

// ---------------------------------------------------------------------------
// ABOUT (Part D1)
// ---------------------------------------------------------------------------

export const about = {
  eyebrow: 'OUR STORY',
  headline: 'Technology is understood when it is built.',
  // TODO_CLIENT: replace with the client's OUR STORY text, as written.
  story: [
    'CircuitBay started in classrooms — years of teaching electronics, IoT and AI to students who were curious but stuck between the textbook and a working build.',
    'The same gaps showed up every time: parts that were hard to find, tutorials that assumed too much, and nobody to ask when a circuit refused to work. CircuitBay exists to close those gaps.',
    'Today we supply components and kits, run workshops for schools and colleges, and bring builders together so that nobody has to build alone.',
  ],
  // TODO_CLIENT: founder name, photo and bio
  founder: {
    name: 'Founder name',
    role: 'Founder, CircuitBay',
    bio: 'An educator and maker who has spent years teaching electronics, IoT and AI in real classrooms — and building alongside students.',
  },
  // TODO_CLIENT: real dates and milestones
  timeline: [
    { year: 'Year 1', title: 'First classroom workshops', body: 'Teaching electronics hands-on, one lab at a time.' },
    { year: 'Year 2', title: 'Kits for students', body: 'Curated component kits so every student could build.' },
    { year: 'Year 3', title: 'Maker labs in schools', body: 'Planning, equipping and launching school labs.' },
    { year: 'Today', title: 'CircuitBay', body: 'A store, a learning hub and a community — in one bay.' },
  ],
  // TODO_CLIENT: real, approved figures, e.g.
  //   { key: 'builders', label: 'Builders reached', value: 12000, suffix: '+' }
  // The stats strip is hidden while this is empty.
  stats: [],
}

// ---------------------------------------------------------------------------
// CONTACT (Part D2)
// ---------------------------------------------------------------------------

export const contact = {
  roles: ['Student', 'Educator', 'Institution', 'Hobbyist'],
  // TODO_CLIENT: real contact channels
  channels: [
    { icon: 'mail', label: 'Email', value: 'hello@circuitbay.in', href: 'mailto:hello@circuitbay.in' },
    { icon: 'phone', label: 'Phone / WhatsApp', value: '+91 00000 00000', href: 'tel:+910000000000' },
    { icon: 'pin', label: 'Visit', value: 'Address — TODO_CLIENT', href: null },
  ],
}

// ---------------------------------------------------------------------------
// FOOTER (Part A7)
// ---------------------------------------------------------------------------

export const footer = {
  columns: [
    {
      title: 'Shop',
      links: [
        { label: 'All kits', to: '/shop' },
        { label: 'Track order', to: '/shop/track' },
        { label: 'My account', to: '/account' },
        { label: 'Request a part', to: '/request-a-part' },
        { label: 'FAQ', to: '/faq' },
      ],
    },
    {
      title: 'Learn',
      links: [
        { label: 'Blog', to: '/blog' },
        { label: 'Final-year projects', to: '/final-year-projects' },
        { label: 'For schools', to: '/schools' },
      ],
    },
    {
      title: 'Community',
      links: [
        { label: 'Featured projects', to: '/projects' },
        { label: 'Share your build', to: '/projects#submit' },
      ],
    },
    {
      title: 'Company',
      links: [
        { label: 'About', to: '/about' },
        { label: 'Contact', to: '/contact' },
      ],
    },
    {
      title: 'Legal',
      links: [
        { label: 'Privacy', to: '/privacy-policy' },
        { label: 'Terms', to: '/terms' },
        { label: 'Refund', to: '/refund-policy' },
        { label: 'Shipping', to: '/shipping-policy' },
      ],
    },
  ],
  // TODO_CLIENT: real social URLs
  social: [
    { icon: 'instagram', label: 'Instagram', href: '#' },
    { icon: 'youtube', label: 'YouTube', href: '#' },
    { icon: 'discord', label: 'Discord', href: '#' },
    { icon: 'linkedin', label: 'LinkedIn', href: '#' },
  ],
}

import { useInView } from '../../hooks/useInView.js'

// A single reusable PCB-trace SVG with three visual states:
//   - "broken"        — dashed, disconnected, dim
//   - "reconnecting"  — draws itself in on scroll
//   - "illuminated"   (Loop section)    — fully lit, glowing, animated pulse
//
// TODO_CLIENT: swap this generated trace for the final circuit-trace SVG
// artwork per section once supplied (see brief item 2, "Circuit-trace SVG
// assets for each section state").
export function CircuitTrace({ state = 'reconnecting', className = '' }) {
  const [ref, inView] = useInView({ threshold: 0.4 })

  const path =
    'M0 60 H120 L150 30 H320 L350 60 H520 L550 30 H680 L710 60 H900'
  const nodes = [120, 320, 520, 680, 900]

  const stroke =
    state === 'broken' ? '#cbd5e1' : state === 'illuminated' ? '#15a35d' : '#3f7dde'

  return (
    <svg
      ref={ref}
      viewBox="0 0 900 90"
      className={className}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <path
        d={path}
        fill="none"
        stroke={stroke}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={state === 'broken' ? '10 14' : undefined}
        opacity={state === 'broken' ? 0.7 : 1}
        className={
          state !== 'broken' ? `trace-path${inView ? ' is-lit' : ''}` : undefined
        }
        style={
          state !== 'broken'
            ? {
                '--trace-length': 1400,
                filter:
                  state === 'illuminated'
                    ? 'drop-shadow(0 0 6px rgba(21,163,93,0.5))'
                    : 'drop-shadow(0 0 4px rgba(63,125,222,0.4))',
              }
            : undefined
        }
      />
      {nodes.map((x) => (
        <circle
          key={x}
          cx={x}
          cy={x === 120 || x === 520 || x === 900 ? 60 : 30}
          r={state === 'broken' ? 3 : 4.5}
          fill={stroke}
          opacity={state === 'broken' ? 0.5 : 1}
          className={state === 'illuminated' ? 'animate-pulse-soft' : undefined}
        />
      ))}
    </svg>
  )
}

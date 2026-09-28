import { useCountUp } from '../../hooks/useCountUp.js'
import { useReducedMotion } from '../../hooks/useReducedMotion.js'

export function CountUp({ target, start, suffix = '', className = '' }) {
  const reduceMotion = useReducedMotion()
  const value = useCountUp(target, { start, reduceMotion })

  return (
    <span className={className}>
      {value.toLocaleString('en-IN')}
      {suffix}
    </span>
  )
}

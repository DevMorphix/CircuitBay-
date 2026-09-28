import { Icon } from '../ui/Icon.jsx'

export function QtyStepper({ value, onChange, min = 1, max = 99, label = 'Quantity' }) {
  return (
    <div role="group" aria-label={label} className="inline-flex items-center rounded-xl border border-black/10 bg-white">
      <button
        type="button"
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        aria-label="Decrease quantity"
        className="flex h-11 w-10 items-center justify-center text-ink-600 hover:text-brand-600 disabled:opacity-40"
      >
        <Icon name="minus" size={16} />
      </button>
      <span className="w-8 text-center text-sm font-semibold text-ink-900" aria-live="polite">
        {value}
      </span>
      <button
        type="button"
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        aria-label="Increase quantity"
        className="flex h-11 w-10 items-center justify-center text-ink-600 hover:text-brand-600 disabled:opacity-40"
      >
        <Icon name="plus" size={16} />
      </button>
    </div>
  )
}

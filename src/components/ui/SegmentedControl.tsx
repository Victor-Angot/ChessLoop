import clsx from 'clsx'
import type { ReactNode } from 'react'

export function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
  className,
  ariaLabel,
  ariaLabelledBy,
}: {
  value: T
  onChange: (v: T) => void
  options: { value: T; label: ReactNode }[]
  className?: string
  ariaLabel?: string
  ariaLabelledBy?: string
}) {
  return (
    <div
      className={clsx(
        'flex min-w-0 overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-0.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]',
        className,
      )}
      role="radiogroup"
      aria-label={ariaLabel}
      aria-labelledby={ariaLabelledBy}
    >
      {options.map((o) => {
        const selected = value === o.value
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={selected}
            className={clsx(
              'relative flex min-h-0 flex-1 items-center justify-center gap-2 px-[0.85rem] py-2 text-center text-sm font-semibold leading-snug transition-[color,background,box-shadow] duration-150',
              'focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface-2)]',
              selected
                ? 'rounded-md bg-[var(--accent)] text-white shadow-sm'
                : 'rounded-md text-[var(--muted)] hover:bg-[var(--surface-3)] hover:text-[var(--text)]',
            )}
            onClick={() => onChange(o.value)}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

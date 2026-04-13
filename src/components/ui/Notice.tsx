import clsx from 'clsx'

type Variant = 'success' | 'error' | 'info'

export function Notice({
  variant,
  children,
  className,
}: {
  variant: Variant
  children: React.ReactNode
  className?: string
}) {
  return (
    <div
      role="status"
      className={clsx(
        'rounded-lg border px-3 py-2 text-sm',
        variant === 'success' &&
          'border-emerald-500/40 bg-emerald-500/10 text-emerald-100',
        variant === 'error' &&
          'border-red-500/40 bg-red-500/10 text-red-100',
        variant === 'info' &&
          'border-[var(--border)] bg-[var(--surface-2)] text-[var(--text)]',
        className,
      )}
    >
      {children}
    </div>
  )
}

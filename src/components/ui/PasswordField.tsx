import { Eye, EyeOff } from 'lucide-react'
import { useId, useState, type ChangeEvent } from 'react'

const inputClass =
  'w-full rounded-md border border-[var(--border)] bg-[var(--surface-2)] py-2 pl-2 pr-10 text-sm text-[var(--text)]'

export function PasswordField({
  id: idProp,
  label,
  value,
  onChange,
  autoComplete = 'current-password',
  required,
  minLength,
  disabled,
}: {
  id?: string
  label: string
  value: string
  onChange: (value: string) => void
  autoComplete?: string
  required?: boolean
  minLength?: number
  disabled?: boolean
}) {
  const uid = useId()
  const id = idProp ?? uid
  const [visible, setVisible] = useState(false)

  return (
    <div className="field">
      <label className="label" htmlFor={id}>
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          className={inputClass}
          type={visible ? 'text' : 'password'}
          autoComplete={autoComplete}
          value={value}
          onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
          required={required}
          minLength={minLength}
          disabled={disabled}
        />
        <button
          type="button"
          className="absolute right-0 top-0 flex h-full w-10 items-center justify-center rounded-r-md text-[var(--muted)] transition-colors hover:bg-[var(--surface-3)] hover:text-[var(--text)] focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)] disabled:pointer-events-none disabled:opacity-40"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? 'Hide password' : 'Show password'}
          aria-pressed={visible}
          disabled={disabled}
        >
          {visible ? (
            <EyeOff className="h-4 w-4 shrink-0" strokeWidth={2} aria-hidden />
          ) : (
            <Eye className="h-4 w-4 shrink-0" strokeWidth={2} aria-hidden />
          )}
        </button>
      </div>
    </div>
  )
}

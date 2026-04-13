import { useState } from 'react'
import { Link } from 'react-router-dom'
import { requestPasswordReset } from '../lib/authApi'

const inputClass =
  'w-full rounded-md border border-[var(--border)] bg-[var(--surface-2)] px-2 py-2 text-sm text-[var(--text)]'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      await requestPasswordReset(email)
      setSent(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Request failed.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="app-shell">
      <main className="container-app flex flex-1 flex-col items-center justify-center py-16 sm:py-20">
        <div className="card w-full max-w-lg panel space-y-6 sm:space-y-8">
          <div>
            <h1 className="text-lg font-bold">Forgot password</h1>
            <p className="muted mt-1 text-sm">
              Enter your email address. If an account exists with a password, you
              will receive a link to choose a new one.
            </p>
          </div>

          {sent ? (
            <div className="space-y-4">
              <p
                className="rounded-md border border-emerald-900/50 bg-emerald-950/35 px-3 py-2 text-sm text-emerald-100"
                role="status"
              >
                If this email is registered, a message with a reset link has been
                sent. Check your inbox and spam folder.
              </p>
              <Link to="/login" className="btn btn-primary block w-full text-center">
                Back to sign in
              </Link>
            </div>
          ) : (
            <>
              {error ? (
                <p
                  className="rounded-md border border-red-900/60 bg-red-950/40 px-3 py-2 text-sm text-red-200"
                  role="alert"
                >
                  {error}
                </p>
              ) : null}
              <form className="space-y-4" onSubmit={(e) => void onSubmit(e)}>
                <label className="field">
                  <span className="label">Email</span>
                  <input
                    className={inputClass}
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </label>
                <button
                  type="submit"
                  className="btn btn-primary w-full"
                  disabled={busy}
                >
                  {busy ? 'Sending…' : 'Send reset link'}
                </button>
              </form>
            </>
          )}

          <p className="text-center">
            <Link to="/login" className="muted text-sm hover:text-[var(--text)]">
              ← Back to sign in
            </Link>
          </p>
        </div>
      </main>
    </div>
  )
}

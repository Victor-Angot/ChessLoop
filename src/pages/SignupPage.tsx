import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import { PasswordField } from '../components/ui/PasswordField'

const inputClass =
  'w-full rounded-md border border-[var(--border)] bg-[var(--surface-2)] px-2 py-2 text-sm text-[var(--text)]'

export default function SignupPage() {
  const { user, status, register } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  /** After email/password signup: show success; skip redirect to home. */
  const [postSignup, setPostSignup] = useState<{ confirmationEmailSent: boolean } | null>(
    null,
  )

  useEffect(() => {
    if (status === 'ready' && user && postSignup === null) {
      navigate('/', { replace: true })
    }
  }, [user, status, navigate, postSignup])

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      const r = await register(email, password)
      setPostSignup({ confirmationEmailSent: r.confirmationEmailSent })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign up failed.')
    } finally {
      setBusy(false)
    }
  }

  if (postSignup !== null && user) {
    return (
      <div className="app-shell">
        <main className="container-app flex flex-1 flex-col items-center justify-center py-16 sm:py-20">
          <div className="card w-full max-w-lg panel space-y-6 sm:space-y-8">
            <h1 className="text-lg font-bold">Account created</h1>
            <p className="text-sm text-[var(--text)]">
              You are signed in as <strong>{user.email}</strong>.
            </p>
            {postSignup.confirmationEmailSent ? (
              <p
                className="rounded-md border border-emerald-900/50 bg-emerald-950/35 px-3 py-2 text-sm text-emerald-100"
                role="status"
              >
                A confirmation email has been sent to your address.
              </p>
            ) : (
              <p className="muted text-sm">
                No confirmation email was sent (SMTP is not configured on the server).
              </p>
            )}
            <Link to="/" className="btn btn-primary block w-full text-center">
              Open trainer
            </Link>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="app-shell">
      <main className="container-app flex flex-1 flex-col items-center justify-center py-16 sm:py-20">
        <div className="card w-full max-w-lg panel space-y-6 sm:space-y-8">
          <div>
            <h1 className="text-lg font-bold">Create account</h1>
            <p className="muted mt-1 text-sm">
              Password must be at least 8 characters.
            </p>
          </div>

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
            <PasswordField
              id="signup-password"
              label="Password"
              value={password}
              onChange={setPassword}
              autoComplete="new-password"
              required
              minLength={8}
            />
            <button type="submit" className="btn btn-primary w-full" disabled={busy}>
              {busy ? 'Creating account…' : 'Sign up'}
            </button>
          </form>

          <p className="muted text-center text-sm">
            Already have an account?{' '}
            <Link to="/login" className="text-[var(--accent)] hover:underline">
              Sign in
            </Link>
          </p>
          <p className="text-center">
            <Link to="/" className="muted text-sm hover:text-[var(--text)]">
              ← Back to trainer
            </Link>
          </p>
        </div>
      </main>
    </div>
  )
}

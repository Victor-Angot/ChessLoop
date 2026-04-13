import { useEffect, useState } from 'react'
import {
  Link,
  useLocation,
  useNavigate,
  useSearchParams,
} from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import { PasswordField } from '../components/ui/PasswordField'

const inputClass =
  'w-full rounded-md border border-[var(--border)] bg-[var(--surface-2)] px-2 py-2 text-sm text-[var(--text)]'

/** Query `error` codes from OAuth redirect (keys unchanged for server compatibility). */
const oauthRedirectErrorMessage: Record<string, string> = {
  google_config: 'External sign-in is not configured on the server.',
  google_denied: 'External sign-in was cancelled.',
  google_missing_code: 'Sign-in did not complete. Try again.',
  google_token: 'Could not complete sign-in (token exchange failed).',
  google_profile: 'Could not read your profile from the identity provider.',
  google_email: 'No email was returned for this account.',
  google_network: 'Network error during sign-in.',
  google_link_conflict:
    'This email is already linked to a different external account.',
}

export default function LoginPage() {
  const { user, status, login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [params] = useSearchParams()
  const from =
    typeof (location.state as { from?: string } | null)?.from === 'string'
      ? (location.state as { from: string }).from
      : '/'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    const code = params.get('error')
    if (code && oauthRedirectErrorMessage[code]) {
      setError(oauthRedirectErrorMessage[code])
    }
  }, [params])

  useEffect(() => {
    if (status === 'ready' && user) {
      navigate(from === '/login' ? '/' : from, { replace: true })
    }
  }, [user, status, navigate, from])

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      await login(email, password)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="app-shell">
      <main className="container-app flex flex-1 flex-col items-center justify-center py-16 sm:py-20">
        <div className="card w-full max-w-lg panel space-y-6 sm:space-y-8">
          <div>
            <h1 className="text-lg font-bold">Sign in</h1>
            <p className="muted mt-1 text-sm">
              Sign in with your email and password.
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
              id="login-password"
              label="Password"
              value={password}
              onChange={setPassword}
              autoComplete="current-password"
              required
            />
            <button type="submit" className="btn btn-primary w-full" disabled={busy}>
              {busy ? 'Signing in…' : 'Sign in'}
            </button>
            <p className="text-center">
              <Link
                to="/forgot-password"
                className="text-sm text-[var(--accent)] hover:underline"
              >
                Forgot password?
              </Link>
            </p>
          </form>

          <p className="muted text-center text-sm">
            No account?{' '}
            <Link to="/signup" className="text-[var(--accent)] hover:underline">
              Create one
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

import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import { PasswordField } from '../components/ui/PasswordField'
import { resetPasswordWithToken } from '../lib/authApi'

export default function ResetPasswordPage() {
  const [params] = useSearchParams()
  const token = params.get('token') ?? ''
  const navigate = useNavigate()
  const { refresh } = useAuth()
  const [password, setPassword] = useState('')
  const [password2, setPassword2] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!token.trim()) {
      setError('Missing reset token. Open the link from your email.')
    }
  }, [token])

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    if (password !== password2) {
      setError('Passwords do not match.')
      return
    }
    setBusy(true)
    try {
      await resetPasswordWithToken(token, password)
      await refresh()
      navigate('/', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Reset failed.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="app-shell">
      <main className="container-app flex flex-1 flex-col items-center justify-center py-16 sm:py-20">
        <div className="card w-full max-w-lg panel space-y-6 sm:space-y-8">
          <div>
            <h1 className="text-lg font-bold">New password</h1>
            <p className="muted mt-1 text-sm">Choose a new password (at least 8 characters).</p>
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
            <PasswordField
              id="reset-password"
              label="New password"
              value={password}
              onChange={setPassword}
              autoComplete="new-password"
              required
              minLength={8}
              disabled={!token.trim()}
            />
            <PasswordField
              id="reset-password-confirm"
              label="Confirm password"
              value={password2}
              onChange={setPassword2}
              autoComplete="new-password"
              required
              minLength={8}
              disabled={!token.trim()}
            />
            <button
              type="submit"
              className="btn btn-primary w-full"
              disabled={busy || !token.trim()}
            >
              {busy ? 'Saving…' : 'Save password'}
            </button>
          </form>

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

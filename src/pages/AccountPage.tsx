import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'

export default function AccountPage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [busy, setBusy] = useState(false)

  const onLogout = async () => {
    setBusy(true)
    try {
      await logout()
      navigate('/', { replace: true })
    } finally {
      setBusy(false)
    }
  }

  if (!user) return null

  return (
    <div className="app-shell">
      <main className="container-app flex flex-1 flex-col py-16 sm:py-20">
        <div className="card w-full max-w-lg panel space-y-5 sm:space-y-6">
          <h1 className="text-lg font-bold">Account</h1>
          <dl className="space-y-2 text-sm">
            <div>
              <dt className="label">Email</dt>
              <dd className="mt-0.5">{user.email}</dd>
            </div>
            <div>
              <dt className="label">Member since</dt>
              <dd className="muted mt-0.5">
                {new Date(user.created_at).toLocaleString()}
              </dd>
            </div>
          </dl>
          <div className="flex flex-wrap gap-2 pt-2">
            <button
              type="button"
              className="btn btn-primary"
              disabled={busy}
              onClick={() => void onLogout()}
            >
              {busy ? 'Signing out…' : 'Sign out'}
            </button>
            <Link to="/" className="btn btn-ghost">
              Open trainer
            </Link>
            {user.is_admin ? (
              <Link to="/admin/analytics" className="btn btn-ghost">
                Site analytics
              </Link>
            ) : null}
          </div>
          <p className="muted text-xs">
            Session is stored in an HTTP-only cookie (JWT). This page is only
            available when you are signed in.
          </p>
        </div>
      </main>
    </div>
  )
}

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import { fetchAdminAnalytics, type AnalyticsSummary } from '../lib/authApi'

export default function AdminAnalyticsPage() {
  const { user, status } = useAuth()
  const [data, setData] = useState<AnalyticsSummary | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (status !== 'ready' || !user?.is_admin) {
      setLoading(false)
      return
    }
    let cancelled = false
    void (async () => {
      setLoading(true)
      setError(null)
      try {
        const summary = await fetchAdminAnalytics()
        if (!cancelled) setData(summary)
      } catch (e) {
        if (!cancelled) {
          setData(null)
          setError(e instanceof Error ? e.message : 'Could not load analytics.')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [status, user?.is_admin])

  if (status === 'loading') {
    return (
      <div className="app-shell">
        <main className="container-app py-16">
          <p className="muted text-sm">Loading session…</p>
        </main>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="app-shell">
        <main className="container-app py-16">
          <p className="text-sm">Sign in to continue.</p>
          <Link to="/login" className="btn btn-primary mt-4 inline-flex">
            Log in
          </Link>
        </main>
      </div>
    )
  }

  if (!user.is_admin) {
    return (
      <div className="app-shell">
        <main className="container-app flex flex-1 flex-col py-16 sm:py-20">
          <div className="card w-full max-w-lg panel space-y-4">
            <h1 className="text-lg font-bold">Analytics</h1>
            <p className="muted text-sm">
              This page is restricted to site administrators. Add your email to{' '}
              <code className="rounded bg-[var(--surface-3)] px-1 py-0.5 text-xs">
                ADMIN_EMAILS
              </code>{' '}
              in the API environment, then sign in again.
            </p>
            <Link to="/account" className="btn btn-ghost inline-flex w-fit">
              Back to account
            </Link>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="app-shell">
      <main className="container-app flex flex-1 flex-col py-16 sm:py-20">
        <div className="card w-full max-w-2xl panel space-y-6">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h1 className="text-lg font-bold">Site analytics</h1>
            <Link to="/account" className="muted text-sm hover:text-[var(--text)]">
              Account
            </Link>
          </div>
          <p className="muted text-xs">
            Counts come from this app’s database (registered accounts and successful
            sign-ins). For traffic and funnels, use your Google Analytics property.
          </p>

          {loading ? (
            <p className="muted text-sm">Loading…</p>
          ) : error ? (
            <p className="text-sm text-red-400">{error}</p>
          ) : data ? (
            <>
              <dl className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface-2)] p-4">
                  <dt className="label">Total accounts</dt>
                  <dd className="mt-1 text-2xl font-bold tabular-nums">
                    {data.totalAccounts}
                  </dd>
                </div>
                <div className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface-2)] p-4">
                  <dt className="label">Sign-ins (24 h)</dt>
                  <dd className="mt-1 text-2xl font-bold tabular-nums">
                    {data.loginsLast24Hours}
                  </dd>
                </div>
                <div className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface-2)] p-4">
                  <dt className="label">Sign-ins (7 days)</dt>
                  <dd className="mt-1 text-2xl font-bold tabular-nums">
                    {data.loginsLast7Days}
                  </dd>
                </div>
                <div className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface-2)] p-4">
                  <dt className="label">Sign-ins (30 days)</dt>
                  <dd className="mt-1 text-2xl font-bold tabular-nums">
                    {data.loginsLast30Days}
                  </dd>
                </div>
              </dl>

              <div>
                <h2 className="mb-2 text-sm font-semibold">Sign-ins by day (14 days)</h2>
                <div className="overflow-x-auto rounded-[var(--radius-sm)] border border-[var(--border)]">
                  <table className="w-full min-w-[16rem] text-left text-sm">
                    <thead>
                      <tr className="border-b border-[var(--border)] bg-[var(--surface-2)]">
                        <th className="px-3 py-2 font-medium">Date (UTC)</th>
                        <th className="px-3 py-2 font-medium text-right">Count</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.loginsByDay.length === 0 ? (
                        <tr>
                          <td colSpan={2} className="muted px-3 py-4 text-center">
                            No sign-ins recorded in this period.
                          </td>
                        </tr>
                      ) : (
                        data.loginsByDay.map((row) => (
                          <tr
                            key={row.date}
                            className="border-b border-[var(--border)] last:border-0"
                          >
                            <td className="px-3 py-2 tabular-nums">{row.date}</td>
                            <td className="px-3 py-2 text-right tabular-nums">
                              {row.count}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : null}
        </div>
      </main>
    </div>
  )
}

import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import { fetchAdminAnalytics, type AnalyticsSummary } from '../lib/authApi'
import { Activity, ShieldCheck } from 'lucide-react'

export default function AdminAnalyticsPage() {
  const { user, status } = useAuth()
  const [data, setData] = useState<AnalyticsSummary | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const spark = useMemo(() => {
    if (!data?.loginsByDay?.length) return null
    const values = data.loginsByDay.map((d) => d.count)
    const max = Math.max(...values, 1)
    return { max, values }
  }, [data])

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
        <div className="relative w-full max-w-2xl">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-10 left-1/2 h-40 w-[calc(100%+3rem)] -translate-x-1/2 overflow-hidden"
          >
            <svg
              className="h-full w-full opacity-[0.9]"
              viewBox="0 0 1200 220"
              preserveAspectRatio="none"
            >
              <defs>
                <linearGradient id="adminCurve" x1="0" x2="1" y1="0" y2="1">
                  <stop offset="0%" stopColor="rgba(91, 140, 255, 0.26)" />
                  <stop offset="55%" stopColor="rgba(124, 92, 255, 0.18)" />
                  <stop offset="100%" stopColor="rgba(91, 140, 255, 0.06)" />
                </linearGradient>
                <radialGradient id="adminGlow" cx="30%" cy="0%" r="70%">
                  <stop offset="0%" stopColor="rgba(255,255,255,0.14)" />
                  <stop offset="60%" stopColor="rgba(255,255,255,0.00)" />
                </radialGradient>
              </defs>
              <path
                d="M0,120 C220,30 420,10 600,60 C780,110 980,120 1200,55 L1200,220 L0,220 Z"
                fill="url(#adminCurve)"
              />
              <path
                d="M0,120 C220,30 420,10 600,60 C780,110 980,120 1200,55"
                fill="none"
                stroke="rgba(255,255,255,0.10)"
                strokeWidth="1"
              />
              <rect width="1200" height="220" fill="url(#adminGlow)" />
            </svg>
          </div>

          <div className="card relative w-full panel space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <span className="grid h-9 w-9 place-items-center rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface-2)]">
                  <Activity className="h-4 w-4 text-[var(--text)]" aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <h1 className="text-lg font-bold leading-tight">Site analytics</h1>
                  <p className="muted text-xs">Admin-only operational overview</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="badge">
                  <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                  Admin
                </span>
                <Link
                  to="/account"
                  className="muted text-sm hover:text-[var(--text)]"
                >
                  Account
                </Link>
              </div>
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

              {spark ? (
                <div className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface-2)] p-4">
                  <div className="flex items-baseline justify-between gap-3">
                    <h2 className="text-sm font-semibold">Activity sparkline</h2>
                    <p className="muted text-xs tabular-nums">14d · max {spark.max}</p>
                  </div>
                  <div className="mt-3 flex h-14 items-end gap-1">
                    {spark.values.map((v, idx) => {
                      const h = Math.max(2, Math.round((v / spark.max) * 56))
                      const isLast = idx === spark.values.length - 1
                      return (
                        <div
                          // eslint-disable-next-line react/no-array-index-key
                          key={idx}
                          className="flex-1"
                        >
                          <div
                            className={[
                              'w-full rounded-sm',
                              isLast
                                ? 'bg-[linear-gradient(135deg,var(--accent),var(--accent-2))]'
                                : 'bg-[color-mix(in_srgb,var(--accent)_35%,var(--surface-3))]',
                            ].join(' ')}
                            style={{ height: `${h}px` }}
                            title={`${v}`}
                            aria-hidden="true"
                          />
                        </div>
                      )
                    })}
                  </div>
                </div>
              ) : null}

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
        </div>
      </main>
    </div>
  )
}

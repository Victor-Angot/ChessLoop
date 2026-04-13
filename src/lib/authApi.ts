const apiBase = import.meta.env.VITE_API_BASE ?? ''

export function apiUrl(path: string): string {
  return `${apiBase}${path}`
}

function url(path: string): string {
  return apiUrl(path)
}

function mapNetworkError(err: unknown): Error {
  if (err instanceof TypeError) {
    const m = err.message.toLowerCase()
    if (m.includes('fetch') || m.includes('network') || m.includes('failed')) {
      return new Error(
        'Cannot reach the auth server (connection refused). Restart dev with `npm run dev` so Vite starts the API on port 3001, or run `npm run dev:server` in a second terminal.',
      )
    }
  }
  return err instanceof Error ? err : new Error(String(err))
}

async function authFetch(path: string, init?: RequestInit): Promise<Response> {
  try {
    return await fetch(url(path), init)
  } catch (e) {
    throw mapNetworkError(e)
  }
}

export interface AuthUser {
  id: string
  email: string
  created_at: string
  is_admin: boolean
}

export interface AnalyticsSummary {
  totalAccounts: number
  loginsLast24Hours: number
  loginsLast7Days: number
  loginsLast30Days: number
  loginsByDay: { date: string; count: number }[]
}

export interface AuthProviders {
  google: boolean
}

async function parseJson<T>(r: Response): Promise<T> {
  const text = await r.text()
  if (!text) return {} as T
  return JSON.parse(text) as T
}

export async function fetchAuthProviders(): Promise<AuthProviders> {
  const r = await fetch(url('/api/auth/providers'), { credentials: 'include' })
  if (!r.ok) return { google: false }
  return parseJson<AuthProviders>(r)
}

export async function fetchMe(): Promise<AuthUser | null> {
  const r = await authFetch('/api/auth/me', { credentials: 'include' })
  if (r.status === 401) return null
  if (!r.ok) throw new Error('Could not load your session.')
  const body = await parseJson<{ user: AuthUser }>(r)
  const u = body.user
  return {
    ...u,
    is_admin: Boolean(u.is_admin),
  }
}

export async function fetchAdminAnalytics(): Promise<AnalyticsSummary> {
  const r = await authFetch('/api/admin/analytics', { credentials: 'include' })
  const body = await parseJson<{ error?: string } & Partial<AnalyticsSummary>>(r)
  if (r.status === 403) {
    throw new Error('You do not have access to analytics.')
  }
  if (!r.ok) {
    throw new Error(body.error ?? 'Could not load analytics.')
  }
  if (
    typeof body.totalAccounts !== 'number' ||
    typeof body.loginsLast24Hours !== 'number'
  ) {
    throw new Error('Invalid analytics response.')
  }
  return body as AnalyticsSummary
}

export async function loginWithPassword(
  email: string,
  password: string,
): Promise<AuthUser> {
  const r = await authFetch('/api/auth/login', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  const body = await parseJson<{ error?: string; user?: AuthUser }>(r)
  if (!r.ok) {
    throw new Error(body.error ?? 'Login failed.')
  }
  if (!body.user) throw new Error('Login failed.')
  return body.user
}

export interface RegisterWithPasswordResult {
  user: AuthUser
  confirmationEmailSent: boolean
}

export async function registerWithPassword(
  email: string,
  password: string,
): Promise<RegisterWithPasswordResult> {
  const r = await authFetch('/api/auth/register', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  const body = await parseJson<{
    error?: string
    user?: AuthUser
    confirmationEmailSent?: boolean
  }>(r)
  if (!r.ok) {
    throw new Error(body.error ?? 'Could not create account.')
  }
  if (!body.user) throw new Error('Could not create account.')
  return {
    user: body.user,
    confirmationEmailSent: Boolean(body.confirmationEmailSent),
  }
}

export async function requestPasswordReset(email: string): Promise<void> {
  const r = await authFetch('/api/auth/forgot-password', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  })
  const body = await parseJson<{ error?: string }>(r)
  if (!r.ok) {
    throw new Error(body.error ?? 'Request failed.')
  }
}

export async function resetPasswordWithToken(
  token: string,
  password: string,
): Promise<AuthUser> {
  const r = await authFetch('/api/auth/reset-password', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, password }),
  })
  const body = await parseJson<{ error?: string; user?: AuthUser }>(r)
  if (!r.ok) {
    throw new Error(body.error ?? 'Could not reset password.')
  }
  if (!body.user) throw new Error('Could not reset password.')
  return body.user
}

export async function logout(): Promise<void> {
  await authFetch('/api/auth/logout', {
    method: 'POST',
    credentials: 'include',
  })
}

export function googleSignInUrl(): string {
  return url('/api/auth/google')
}

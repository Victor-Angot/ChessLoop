import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  fetchMe,
  loginWithPassword,
  logout as apiLogout,
  registerWithPassword,
  type AuthUser,
} from '../lib/authApi'
import { AuthContext, type AuthStatus } from './auth-context'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [status, setStatus] = useState<AuthStatus>('loading')

  const refresh = useCallback(async () => {
    try {
      const u = await fetchMe()
      setUser(u)
    } catch {
      setUser(null)
    } finally {
      setStatus('ready')
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const login = useCallback(async (email: string, password: string) => {
    const u = await loginWithPassword(email, password)
    setUser(u)
  }, [])

  const register = useCallback(async (email: string, password: string) => {
    const r = await registerWithPassword(email, password)
    setUser(r.user)
    return { confirmationEmailSent: r.confirmationEmailSent }
  }, [])

  const logout = useCallback(async () => {
    await apiLogout()
    setUser(null)
  }, [])

  const value = useMemo(
    () => ({
      user,
      status,
      refresh,
      login,
      register,
      logout,
    }),
    [user, status, refresh, login, register, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

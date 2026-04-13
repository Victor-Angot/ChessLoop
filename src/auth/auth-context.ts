import { createContext } from 'react'
import type { AuthUser } from '../lib/authApi'

export type AuthStatus = 'loading' | 'ready'

export interface AuthContextValue {
  user: AuthUser | null
  status: AuthStatus
  refresh: () => Promise<void>
  login: (email: string, password: string) => Promise<void>
  register: (
    email: string,
    password: string,
  ) => Promise<{ confirmationEmailSent: boolean }>
  logout: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)

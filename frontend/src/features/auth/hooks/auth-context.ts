import { createContext, useContext } from 'react'
import type { Account } from '@/shared/types/domain'
interface AuthContextValue {
  user: Account | null
  loading: boolean
  error: unknown
  login: (login: string, password: string) => Promise<Account>
  logout: () => Promise<void>
  refresh: () => Promise<void>
}
export const AuthContext = createContext<AuthContextValue | null>(null)
export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('AuthProvider ausente.')
  return context
}

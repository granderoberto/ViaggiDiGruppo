import { createContext, useContext } from 'react'
import type { User } from './types'

export interface AuthContextValue {
  user: User | null
  login: (username: string, password: string) => Promise<void>
  logout: () => void
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth deve essere usato dentro AuthProvider')
  }

  return context
}

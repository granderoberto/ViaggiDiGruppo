import { useMemo, useState, type ReactNode } from 'react'
import { request } from '../api/apiClient'
import { clearStoredUser, getStoredUser, setStoredUser } from './authStore'
import { AuthContext, type AuthContextValue } from './authContext.ts'
import type { User } from './types'

interface LoginResponse {
  user: User
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => getStoredUser())

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      login: async (username: string, password: string) => {
        const data = await request<LoginResponse>('/login', {
          method: 'POST',
          body: JSON.stringify({ username, password }),
        })

        setUser(data.user)
        setStoredUser(data.user)
      },
      logout: () => {
        setUser(null)
        clearStoredUser()
      },
    }),
    [user],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

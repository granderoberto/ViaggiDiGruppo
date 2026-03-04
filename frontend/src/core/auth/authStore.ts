import type { User } from './types'

const STORAGE_KEY = 'user'

export function getStoredUser(): User | null {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) {
    return null
  }

  try {
    return JSON.parse(raw) as User
  } catch {
    localStorage.removeItem(STORAGE_KEY)
    return null
  }
}

export function setStoredUser(user: User): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(user))
}

export function clearStoredUser(): void {
  localStorage.removeItem(STORAGE_KEY)
}

export type UserRole = 'USER' | 'ADMIN'

export interface User {
  id: string
  username: string
  displayName: string
  role: UserRole
}

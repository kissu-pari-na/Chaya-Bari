import type { Role } from './auth'

export interface AdminUser {
  id: string
  name: string
  email: string
  phone: string | null
  role: Role
  isActive: boolean
  createdAt: string
  /** The admin who created this account (null for self-registered customers). */
  createdBy: { id: string; name: string } | null
}

export interface CreateUserInput {
  name: string
  email: string
  phone: string
  password: string
  role: Role
}

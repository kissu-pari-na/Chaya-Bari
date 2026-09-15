export type Role = 'CUSTOMER' | 'ADMIN' | 'KITCHEN'

export interface AuthUser {
  id: string
  name: string
  email: string
  phone: string | null
  role: Role
  emailVerified: boolean
  createdAt: string
}

export interface AuthResponse {
  user: AuthUser
  token: string
}

export interface RegisterPayload {
  name: string
  email: string
  phone: string
  password: string
}

/// Registration no longer logs the user in — the email address must be
/// confirmed first.
export interface RegisterResult {
  user: AuthUser
  requiresEmailVerification: boolean
}

export interface LoginPayload {
  identifier: string
  password: string
}

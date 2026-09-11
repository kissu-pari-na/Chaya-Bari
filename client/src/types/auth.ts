export type Role = 'CUSTOMER' | 'ADMIN' | 'KITCHEN'

export interface AuthUser {
  id: string
  name: string
  email: string
  phone: string | null
  role: Role
}

export interface AuthResponse {
  user: AuthUser
  token: string
}

export interface RegisterPayload {
  name: string
  email: string
  phone?: string
  password: string
}

export interface LoginPayload {
  email: string
  password: string
}

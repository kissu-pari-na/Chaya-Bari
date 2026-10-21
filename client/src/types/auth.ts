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

/// Fields a signed-in user can change on their own profile.
export interface UpdateProfilePayload {
  name?: string
  phone?: string
}

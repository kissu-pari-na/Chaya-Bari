import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { apiRequest, getToken, setToken } from '../lib/apiClient'
import type {
  AuthResponse,
  AuthUser,
  LoginPayload,
  RegisterPayload,
  RegisterResult,
  UpdateProfilePayload,
} from '../types/auth'

interface AuthContextValue {
  user: AuthUser | null
  loading: boolean
  login: (payload: LoginPayload) => Promise<AuthUser>
  /// Registers the account and sends an email confirmation code; does NOT log
  /// in — the email address must be confirmed first (see verifyEmail).
  register: (payload: RegisterPayload) => Promise<RegisterResult>
  /// Confirm the email with the code; on success the user is logged in.
  verifyEmail: (email: string, code: string) => Promise<AuthUser>
  /// Sign in or register with a Google ID token (credential); logs the user in.
  loginWithGoogle: (credential: string) => Promise<AuthUser>
  /// Update the signed-in user's own profile (e.g. add a missing phone number).
  updateProfile: (payload: UpdateProfilePayload) => Promise<AuthUser>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  // On boot, if a token exists, resolve the current user.
  useEffect(() => {
    let active = true
    async function loadUser() {
      if (!getToken()) {
        setLoading(false)
        return
      }
      try {
        const { user } = await apiRequest<{ user: AuthUser }>('/auth/me', { auth: true })
        if (active) setUser(user)
      } catch {
        setToken(null)
      } finally {
        if (active) setLoading(false)
      }
    }
    void loadUser()
    return () => {
      active = false
    }
  }, [])

  const handleAuth = useCallback((res: AuthResponse) => {
    setToken(res.token)
    setUser(res.user)
    return res.user
  }, [])

  const login = useCallback(
    async (payload: LoginPayload) => {
      const res = await apiRequest<AuthResponse>('/auth/login', { method: 'POST', body: payload })
      return handleAuth(res)
    },
    [handleAuth],
  )

  // Registration no longer logs the user in — it creates the account and sends
  // an email confirmation code. The caller sends the user to the email
  // confirmation screen, which logs them in once the email is confirmed.
  const register = useCallback(async (payload: RegisterPayload) => {
    return apiRequest<RegisterResult>('/auth/register', { method: 'POST', body: payload })
  }, [])

  const verifyEmail = useCallback(
    async (email: string, code: string) => {
      const res = await apiRequest<AuthResponse>('/auth/verify-email', {
        method: 'POST',
        body: { email, code },
      })
      return handleAuth(res)
    },
    [handleAuth],
  )

  const loginWithGoogle = useCallback(
    async (credential: string) => {
      const res = await apiRequest<AuthResponse>('/auth/google', {
        method: 'POST',
        body: { credential },
      })
      return handleAuth(res)
    },
    [handleAuth],
  )

  const updateProfile = useCallback(async (payload: UpdateProfilePayload) => {
    const { user: updated } = await apiRequest<{ user: AuthUser }>('/auth/me', {
      method: 'PATCH',
      body: payload,
      auth: true,
    })
    setUser(updated)
    return updated
  }, [])

  const logout = useCallback(() => {
    setToken(null)
    setUser(null)
  }, [])

  const value = useMemo(
    () => ({ user, loading, login, register, verifyEmail, loginWithGoogle, updateProfile, logout }),
    [user, loading, login, register, verifyEmail, loginWithGoogle, updateProfile, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}

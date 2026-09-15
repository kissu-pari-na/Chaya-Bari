import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { apiRequest, getToken, setToken } from '../lib/apiClient'
import type { AuthResponse, AuthUser, LoginPayload, RegisterPayload, RegisterResult } from '../types/auth'

interface AuthContextValue {
  user: AuthUser | null
  loading: boolean
  login: (payload: LoginPayload) => Promise<AuthUser>
  /// Registers the account and sends confirmation codes; does NOT log in — the
  /// mobile number must be confirmed first (see verifyPhone).
  register: (payload: RegisterPayload) => Promise<RegisterResult>
  /// Confirm the mobile number with the code; on success the user is logged in.
  verifyPhone: (phone: string, code: string) => Promise<AuthUser>
  /// Replace the current user (e.g. after confirming email).
  updateUser: (user: AuthUser) => void
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
  // confirmation codes. The caller sends the user to the phone-confirmation
  // screen, which logs them in once the mobile number is confirmed.
  const register = useCallback(async (payload: RegisterPayload) => {
    return apiRequest<RegisterResult>('/auth/register', { method: 'POST', body: payload })
  }, [])

  const verifyPhone = useCallback(
    async (phone: string, code: string) => {
      const res = await apiRequest<AuthResponse>('/auth/verify-phone', {
        method: 'POST',
        body: { phone, code },
      })
      return handleAuth(res)
    },
    [handleAuth],
  )

  const updateUser = useCallback((next: AuthUser) => {
    setUser(next)
  }, [])

  const logout = useCallback(() => {
    setToken(null)
    setUser(null)
  }, [])

  const value = useMemo(
    () => ({ user, loading, login, register, verifyPhone, updateUser, logout }),
    [user, loading, login, register, verifyPhone, updateUser, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}

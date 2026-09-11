import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { apiRequest, getToken, setToken } from '../lib/apiClient'
import type { AuthResponse, AuthUser, LoginPayload, RegisterPayload } from '../types/auth'

interface AuthContextValue {
  user: AuthUser | null
  loading: boolean
  login: (payload: LoginPayload) => Promise<AuthUser>
  register: (payload: RegisterPayload) => Promise<AuthUser>
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

  const register = useCallback(
    async (payload: RegisterPayload) => {
      const res = await apiRequest<AuthResponse>('/auth/register', { method: 'POST', body: payload })
      return handleAuth(res)
    },
    [handleAuth],
  )

  const logout = useCallback(() => {
    setToken(null)
    setUser(null)
  }, [])

  const value = useMemo(
    () => ({ user, loading, login, register, logout }),
    [user, loading, login, register, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}

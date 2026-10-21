import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { apiRequest, getToken, setToken } from '../lib/apiClient'
import type { AuthResponse, AuthUser, UpdateProfilePayload } from '../types/auth'

interface AuthContextValue {
  user: AuthUser | null
  loading: boolean
  /// Sign in with a Google ID token (credential): the only way to sign in
  /// (vault D-AUTH-004). Creates a customer account on first use.
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
    () => ({ user, loading, loginWithGoogle, updateProfile, logout }),
    [user, loading, loginWithGoogle, updateProfile, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}

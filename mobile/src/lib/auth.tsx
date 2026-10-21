import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  GoogleSignin,
  isErrorWithCode,
  isSuccessResponse,
  statusCodes,
} from '@react-native-google-signin/google-signin'
import { ApiError, apiRequest } from './api'
import { readToken, writeToken } from './storage'
import type { AuthResponse, AuthUser } from './types'

// Sign-in is Google only (R-AUTH-001). Google blocks its web sign-in inside app
// WebViews, so the app uses the native Google SDK: it returns a Google ID token,
// which goes to the same POST /api/auth/google the website uses. The token's
// audience is the web client id (webClientId) on Android and the iOS client id
// on iOS; the server accepts both (GOOGLE_CLIENT_ID + GOOGLE_EXTRA_CLIENT_IDS).

const WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? ''
const IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? ''

/** Whether Google sign-in is configured for this build (R-AUTH-007). */
export const isGoogleEnabled = !!WEB_CLIENT_ID

if (isGoogleEnabled) {
  GoogleSignin.configure({ webClientId: WEB_CLIENT_ID, ...(IOS_CLIENT_ID ? { iosClientId: IOS_CLIENT_ID } : {}) })
}

export type SignInResult = { ok: true; user: AuthUser } | { ok: false; reason: 'cancelled' | 'unavailable' | 'error'; message?: string }

interface AuthValue {
  user: AuthUser | null
  loading: boolean
  signInWithGoogle: () => Promise<SignInResult>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  // Restore the session from the stored JWT.
  useEffect(() => {
    let active = true
    void (async () => {
      if (await readToken()) {
        try {
          const { user: me } = await apiRequest<{ user: AuthUser }>('/auth/me', { auth: true })
          if (active) setUser(me)
        } catch (err) {
          if (err instanceof ApiError && err.status === 401) await writeToken(null)
        }
      }
      if (active) setLoading(false)
    })()
    return () => {
      active = false
    }
  }, [])

  const signInWithGoogle = useCallback(async (): Promise<SignInResult> => {
    if (!isGoogleEnabled) return { ok: false, reason: 'unavailable' }
    try {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true })
      const res = await GoogleSignin.signIn()
      if (!isSuccessResponse(res)) return { ok: false, reason: 'cancelled' }
      const credential = res.data.idToken
      if (!credential) return { ok: false, reason: 'error', message: 'No ID token from Google' }
      const auth = await apiRequest<AuthResponse>('/auth/google', { method: 'POST', body: { credential } })
      await writeToken(auth.token)
      setUser(auth.user)
      return { ok: true, user: auth.user }
    } catch (err) {
      if (isErrorWithCode(err)) {
        if (err.code === statusCodes.IN_PROGRESS) return { ok: false, reason: 'cancelled' }
        if (err.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) return { ok: false, reason: 'unavailable' }
      }
      return { ok: false, reason: 'error', message: err instanceof Error ? err.message : undefined }
    }
  }, [])

  const logout = useCallback(async () => {
    await writeToken(null)
    setUser(null)
    if (isGoogleEnabled) await GoogleSignin.signOut().catch(() => null)
  }, [])

  const value = useMemo(() => ({ user, loading, signInWithGoogle, logout }), [user, loading, signInWithGoogle, logout])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

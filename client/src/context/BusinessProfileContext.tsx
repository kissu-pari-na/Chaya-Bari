import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { BusinessProfile } from '../types/business'
import { defaultBusinessProfile } from '../config/businessProfile'
import { fetchBusinessProfile, updateBusinessProfileApi } from '../lib/businessProfile'

interface BusinessProfileContextValue {
  profile: BusinessProfile
  /** Persists the profile for all clients (admin only). Returns when saved. */
  updateProfile: (patch: Partial<BusinessProfile>) => Promise<void>
}

const BusinessProfileContext = createContext<BusinessProfileContextValue | undefined>(undefined)

/**
 * Provides the business profile to the whole app so the name/logo/contact
 * details stay consistent everywhere they're shown, and can be updated in one
 * place (Business Profile settings).
 *
 * The profile is loaded from — and saved to — the server, so edits persist and
 * are shared across every client. The bundled `defaultBusinessProfile` is only
 * the fallback shown until the fetch resolves (or if the API is unreachable).
 */
export function BusinessProfileProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<BusinessProfile>(defaultBusinessProfile)

  useEffect(() => {
    let active = true
    fetchBusinessProfile()
      .then((p) => active && setProfile(p))
      .catch(() => {
        /* keep the bundled default if the API is unreachable */
      })
    return () => {
      active = false
    }
  }, [])

  const value = useMemo(
    () => ({
      profile,
      updateProfile: async (patch: Partial<BusinessProfile>) => {
        const next = { ...profile, ...patch }
        setProfile(next) // optimistic
        const saved = await updateBusinessProfileApi(next)
        setProfile(saved)
      },
    }),
    [profile],
  )

  return <BusinessProfileContext.Provider value={value}>{children}</BusinessProfileContext.Provider>
}

export function useBusinessProfile() {
  const ctx = useContext(BusinessProfileContext)
  if (!ctx) {
    throw new Error('useBusinessProfile must be used within a BusinessProfileProvider')
  }
  return ctx
}

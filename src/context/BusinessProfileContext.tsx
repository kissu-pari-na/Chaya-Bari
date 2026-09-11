import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import type { BusinessProfile } from '../types/business'
import { defaultBusinessProfile } from '../config/businessProfile'

interface BusinessProfileContextValue {
  profile: BusinessProfile
  updateProfile: (patch: Partial<BusinessProfile>) => void
}

const BusinessProfileContext = createContext<BusinessProfileContextValue | undefined>(undefined)

/**
 * Provides the business profile to the whole app so the name/logo/contact
 * details stay consistent everywhere they're shown, and can be updated in
 * one place (Business Profile settings) instead of duplicated per page.
 *
 * In-memory for now; swapping this for a real settings API later only
 * means changing this provider, not every consumer.
 */
export function BusinessProfileProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<BusinessProfile>(defaultBusinessProfile)

  const value = useMemo(
    () => ({
      profile,
      updateProfile: (patch: Partial<BusinessProfile>) =>
        setProfile((current) => ({ ...current, ...patch })),
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

/**
 * Application roles are intentionally separate from business ownership.
 * A partner may hold an admin account without their ownership percentage
 * being used for authorization — access is always role-based.
 */
export type ApplicationRole = 'business_owner_admin' | 'kitchen' | 'customer'

export interface BusinessPartner {
  id: string
  name: string
  /** Percentage of business ownership (0-100). Not used for authorization. */
  ownershipPercent: number
  email?: string
  phone?: string
  /** Whether this partner also has an application account, and with which role. */
  applicationRole?: ApplicationRole
}

export interface BusinessContact {
  phone: string
  email: string
}

export interface BusinessAddress {
  line1: string
  area: string
  city: string
  postCode?: string
  country: string
}

export interface BusinessDefaultSettings {
  currency: string
  language: 'bn' | 'en'
  orderIdPrefix: string
  timezone: string
}

export interface BusinessProfile {
  /** Official business name, always shown throughout the application. */
  name: string
  nameEnglish?: string
  /** Path/URL to the current logo asset. Configurable, not hard-coded. */
  logoUrl: string
  tagline?: string
  contact: BusinessContact
  address: BusinessAddress
  /** Areas/zones the business currently delivers/serves. */
  deliveryAreas: string[]
  partners: BusinessPartner[]
  defaultSettings: BusinessDefaultSettings
}

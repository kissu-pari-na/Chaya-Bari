import type { BusinessProfile } from '../types/business'

/**
 * Single source of truth for business identity.
 *
 * Kept as plain config (not hard-coded inside components) so the logo,
 * contact details, ownership, etc. can be replaced or later loaded from
 * an admin-editable settings API without touching application code.
 */
export const defaultBusinessProfile: BusinessProfile = {
  name: 'ছায়া বাড়ি',
  nameEnglish: 'Chaya Bari',
  logoUrl: '/logo.png',
  tagline: 'আস্থার ছায়ায় ঘেরা, গুণ ও মানের বসত বাড়ি',
  contact: {
    phone: '+880 1XXXXXXXXX',
    email: 'hello@chayabari.example',
  },
  address: {
    line1: '',
    area: '',
    city: 'Dhaka',
    country: 'Bangladesh',
  },
  deliveryAreas: [],
  partners: [
    {
      id: 'partner-1',
      name: 'Md. Mozahidul Islam Bhuiyan',
      ownershipPercent: 50,
      applicationRole: 'business_owner_admin',
    },
    {
      id: 'partner-2',
      name: 'Tahmina Akter',
      ownershipPercent: 50,
      applicationRole: 'business_owner_admin',
    },
  ],
  defaultSettings: {
    currency: 'BDT',
    language: 'bn',
    orderIdPrefix: 'CB',
    timezone: 'Asia/Dhaka',
  },
}

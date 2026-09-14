import { prisma } from '../../lib/prisma.js'
import { businessProfileSchema, type BusinessProfileInput } from './business.schemas.js'

const SINGLETON_ID = 'singleton'

/// Server-side default identity, used to seed the singleton on first access.
/// Kept in sync with the client's fallback in config/businessProfile.ts.
export const defaultBusinessProfile: BusinessProfileInput = {
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
    { id: 'partner-1', name: 'Md. Mozahidul Islam Bhuiyan', ownershipPercent: 50, applicationRole: 'business_owner_admin' },
    { id: 'partner-2', name: 'Tahmina Akter', ownershipPercent: 50, applicationRole: 'business_owner_admin' },
  ],
  defaultSettings: {
    currency: 'BDT',
    language: 'bn',
    orderIdPrefix: 'CB',
    timezone: 'Asia/Dhaka',
  },
}

/// Reads the business profile, creating the default row on first access.
export async function getBusinessProfile(): Promise<BusinessProfileInput> {
  const existing = await prisma.businessProfileSetting.findUnique({ where: { id: SINGLETON_ID } })
  if (existing) {
    // Tolerate older/partial rows by re-validating against the current shape.
    const parsed = businessProfileSchema.safeParse(existing.data)
    if (parsed.success) return parsed.data
  }
  const created = await prisma.businessProfileSetting.upsert({
    where: { id: SINGLETON_ID },
    create: { id: SINGLETON_ID, data: defaultBusinessProfile },
    update: { data: defaultBusinessProfile },
  })
  return created.data as BusinessProfileInput
}

export async function updateBusinessProfile(input: BusinessProfileInput): Promise<BusinessProfileInput> {
  const saved = await prisma.businessProfileSetting.upsert({
    where: { id: SINGLETON_ID },
    create: { id: SINGLETON_ID, data: input },
    update: { data: input },
  })
  return saved.data as BusinessProfileInput
}

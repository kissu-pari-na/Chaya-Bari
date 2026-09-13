import { z } from 'zod'

const applicationRoles = ['business_owner_admin', 'kitchen', 'customer'] as const

export const businessProfileSchema = z.object({
  name: z.string().min(1).max(120),
  nameEnglish: z.string().max(120).optional(),
  logoUrl: z.string().max(500),
  tagline: z.string().max(200).optional(),
  contact: z.object({
    phone: z.string().max(60),
    email: z.string().max(160),
  }),
  address: z.object({
    line1: z.string().max(200),
    area: z.string().max(120),
    city: z.string().max(120),
    postCode: z.string().max(20).optional(),
    country: z.string().max(120),
  }),
  deliveryAreas: z.array(z.string().max(120)).max(100),
  partners: z
    .array(
      z.object({
        id: z.string().min(1).max(60),
        name: z.string().max(160),
        ownershipPercent: z.number().min(0).max(100),
        email: z.string().max(160).optional(),
        phone: z.string().max(60).optional(),
        applicationRole: z.enum(applicationRoles).optional(),
      }),
    )
    .max(50),
  defaultSettings: z.object({
    currency: z.string().max(10),
    language: z.enum(['bn', 'en']),
    orderIdPrefix: z.string().max(10),
    timezone: z.string().max(60),
  }),
})

export type BusinessProfileInput = z.infer<typeof businessProfileSchema>

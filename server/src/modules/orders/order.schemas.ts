import { z } from 'zod'

const optionalText = (max: number) =>
  z
    .string()
    .max(max)
    .optional()
    .or(z.literal('').transform(() => undefined))

// ---- Addresses ----

export const addressSchema = z.object({
  label: optionalText(60),
  recipientName: z.string().min(2, 'Recipient name is required').max(100),
  recipientPhone: z.string().min(6, 'A valid phone is required').max(20),
  addressLine: z.string().min(3, 'Address is required').max(300),
  area: optionalText(120),
  city: z.string().min(1, 'City is required').max(120),
  note: optionalText(300),
  isDefault: z.boolean().optional(),
})

export const updateAddressSchema = addressSchema.partial()

// ---- Orders ----

const dateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD')

export const checkoutSchema = z.object({
  items: z
    .array(
      z.object({
        productId: z.string().cuid(),
        quantity: z.number().int().min(1, 'Quantity must be at least 1').max(1000),
      }),
    )
    .min(1, 'Your cart is empty'),
  // Either reference a saved address or provide address fields inline.
  addressId: z.string().cuid().optional(),
  address: addressSchema.optional(),
  fulfillmentDate: dateString,
  notes: optionalText(1000),
})

// ---- Ordering settings ----

export const updateOrderingSettingSchema = z.object({
  cutoffTime: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Cutoff must be HH:mm (24-hour)'),
  minAdvanceDays: z.number().int().min(0).max(30),
  defaultDeliveryCost: z.number().min(0).max(100000),
  timezone: z.string().min(1).max(60),
})

export type AddressInput = z.infer<typeof addressSchema>
export type UpdateAddressInput = z.infer<typeof updateAddressSchema>
export type CheckoutInput = z.infer<typeof checkoutSchema>
export type UpdateOrderingSettingInput = z.infer<typeof updateOrderingSettingSchema>

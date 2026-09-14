import { z } from 'zod'

export const deliveryStatuses = [
  'PENDING',
  'ASSIGNED',
  'PICKED_UP',
  'DELIVERED',
  'FAILED',
  'CANCELLED',
] as const

const optionalText = (max: number) =>
  z
    .string()
    .max(max)
    .optional()
    .or(z.literal('').transform(() => undefined))

/// All fields optional so the admin can fill them in over time. `null` clears
/// the actual delivery cost.
export const updateDeliverySchema = z.object({
  provider: optionalText(100),
  trackingRef: optionalText(120),
  actualDeliveryCost: z.number().min(0).max(100000).nullable().optional(),
  status: z.enum(deliveryStatuses).optional(),
})

export type UpdateDeliveryInput = z.infer<typeof updateDeliverySchema>

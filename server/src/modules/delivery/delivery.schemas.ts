import { z } from 'zod'

const optionalText = (max: number) =>
  z
    .string()
    .max(max)
    .optional()
    .or(z.literal('').transform(() => undefined))

/// All fields optional so the admin can fill them in over time. `null` clears
/// the actual delivery cost. (Progress is the order's status, not set here.)
export const updateDeliverySchema = z.object({
  provider: optionalText(100),
  trackingRef: optionalText(120),
  actualDeliveryCost: z.number().min(0).max(100000).nullable().optional(),
})

export type UpdateDeliveryInput = z.infer<typeof updateDeliverySchema>

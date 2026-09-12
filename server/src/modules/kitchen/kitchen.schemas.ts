import { z } from 'zod'

export const kitchenStatuses = ['PENDING', 'PREPARING', 'PREPARED', 'PACKED'] as const

const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD')

export const updateKitchenStatusSchema = z.object({
  date: dateString,
  productId: z.string().cuid(),
  status: z.enum(kitchenStatuses),
})

export type UpdateKitchenStatusInput = z.infer<typeof updateKitchenStatusSchema>

import { z } from 'zod'

export const kitchenStages = ['TO_COOK', 'PREPARING', 'READY'] as const

const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD')

/// Move a single order line to an adjacent stage.
export const moveLineSchema = z.object({
  stage: z.enum(kitchenStages),
})

/// Move all lines of a product on a day from one stage to an adjacent one.
export const bulkMoveSchema = z.object({
  date: dateString,
  productId: z.string().cuid().nullable(),
  from: z.enum(kitchenStages),
  to: z.enum(kitchenStages),
})

/// Pack (or un-pack) a ready order — an order-level step after cooking.
export const packOrderSchema = z.object({
  packed: z.boolean(),
})

export type MoveLineInput = z.infer<typeof moveLineSchema>
export type BulkMoveInput = z.infer<typeof bulkMoveSchema>

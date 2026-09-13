import { z } from 'zod'

/// The stages the kitchen can move an order through.
export const kitchenStages = ['CONFIRMED', 'PREPARING', 'PACKED'] as const

export const setOrderStageSchema = z.object({
  status: z.enum(kitchenStages),
})

export type SetOrderStageInput = z.infer<typeof setOrderStageSchema>

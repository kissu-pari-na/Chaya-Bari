import { z } from 'zod'

export const materialKinds = ['INGREDIENT', 'PACKAGING'] as const

export const createMaterialSchema = z.object({
  name: z.string().min(1, 'Name is required').max(120),
  kind: z.enum(materialKinds),
  unit: z.string().min(1, 'Unit is required').max(20),
})

export const updateMaterialSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  kind: z.enum(materialKinds).optional(),
  unit: z.string().min(1).max(20).optional(),
})

export const adjustStockSchema = z.object({
  quantityDelta: z.number().refine((n) => n !== 0, 'Adjustment cannot be zero'),
  note: z
    .string()
    .max(200)
    .optional()
    .or(z.literal('').transform(() => undefined)),
})

export const createPurchaseSchema = z.object({
  supplier: z
    .string()
    .max(120)
    .optional()
    .or(z.literal('').transform(() => undefined)),
  note: z
    .string()
    .max(300)
    .optional()
    .or(z.literal('').transform(() => undefined)),
  purchasedAt: z.string().datetime().optional(),
  items: z
    .array(
      z.object({
        materialId: z.string().cuid(),
        quantity: z.number().positive('Quantity must be greater than 0').max(1_000_000),
        totalCost: z.number().min(0).max(10_000_000),
      }),
    )
    .min(1, 'At least one purchase line is required'),
})

export const upsertRecipeSchema = z.object({
  yieldQty: z.number().int().positive('Yield must be at least 1').max(100000),
  note: z
    .string()
    .max(300)
    .optional()
    .or(z.literal('').transform(() => undefined)),
  items: z
    .array(
      z.object({
        materialId: z.string().cuid(),
        quantity: z.number().positive('Quantity must be greater than 0').max(1_000_000),
      }),
    )
    .min(1, 'A recipe needs at least one material'),
})

export type CreateMaterialInput = z.infer<typeof createMaterialSchema>
export type UpdateMaterialInput = z.infer<typeof updateMaterialSchema>
export type AdjustStockInput = z.infer<typeof adjustStockSchema>
export type CreatePurchaseInput = z.infer<typeof createPurchaseSchema>
export type UpsertRecipeInput = z.infer<typeof upsertRecipeSchema>

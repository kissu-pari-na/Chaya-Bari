import { z } from 'zod'

export const couponScopes = ['FOOD', 'DELIVERY'] as const
export const couponKinds = ['PERCENT', 'FIXED', 'FREE_DELIVERY'] as const

export const createCouponSchema = z
  .object({
    code: z
      .string()
      .min(2, 'Code is required')
      .max(40)
      .regex(/^[A-Za-z0-9_-]+$/, 'Code may only contain letters, numbers, - and _')
      .transform((s) => s.toUpperCase()),
    description: z
      .string()
      .max(200)
      .optional()
      .or(z.literal('').transform(() => undefined)),
    scope: z.enum(couponScopes),
    kind: z.enum(couponKinds),
    value: z.number().min(0).max(100000).optional(),
    minOrderSubtotal: z.number().min(0).max(1_000_000).optional(),
    isActive: z.boolean().optional(),
    expiresAt: z.string().datetime().optional().or(z.literal('').transform(() => undefined)),
  })
  .superRefine((data, ctx) => {
    if (data.kind === 'FREE_DELIVERY' && data.scope !== 'DELIVERY') {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['scope'], message: 'FREE_DELIVERY requires DELIVERY scope' })
    }
    if (data.kind === 'PERCENT' && (data.value ?? 0) > 100) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['value'], message: 'Percent cannot exceed 100' })
    }
    if ((data.kind === 'PERCENT' || data.kind === 'FIXED') && !data.value) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['value'], message: 'Value is required' })
    }
  })

export const updateCouponSchema = createCouponSchema

export const applyCouponSchema = z.object({
  code: z.string().min(1).max(40),
  items: z
    .array(z.object({ productId: z.string().cuid(), quantity: z.number().int().min(1).max(1000) }))
    .min(1),
})

export type CreateCouponInput = z.infer<typeof createCouponSchema>
export type ApplyCouponInput = z.infer<typeof applyCouponSchema>

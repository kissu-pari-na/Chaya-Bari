import { z } from 'zod'

const ratingSchema = z
  .number({ invalid_type_error: 'Rating must be a number' })
  .int('Rating must be a whole number')
  .min(1, 'Rating must be between 1 and 5')
  .max(5, 'Rating must be between 1 and 5')

const commentSchema = z
  .string()
  .max(1000, 'Comment is too long')
  .optional()
  .or(z.literal('').transform(() => undefined))

const productReviewSchema = z.object({
  productId: z.string().cuid(),
  rating: ratingSchema,
  comment: commentSchema,
})

/// Batch submit for an order's review page: zero or more product reviews plus
/// an optional overall order review. At least one of the two must be present.
export const submitOrderReviewsSchema = z
  .object({
    items: z.array(productReviewSchema).max(50).optional(),
    overall: z.object({ rating: ratingSchema, comment: commentSchema }).optional(),
  })
  .refine((v) => (v.items?.length ?? 0) > 0 || v.overall != null, {
    message: 'Provide at least one product review or an overall review',
  })

export type SubmitOrderReviewsInput = z.infer<typeof submitOrderReviewsSchema>

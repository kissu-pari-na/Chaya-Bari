import { z } from 'zod'

export const createReviewSchema = z.object({
  rating: z
    .number({ invalid_type_error: 'Rating must be a number' })
    .int('Rating must be a whole number')
    .min(1, 'Rating must be between 1 and 5')
    .max(5, 'Rating must be between 1 and 5'),
  comment: z
    .string()
    .max(1000, 'Comment is too long')
    .optional()
    .or(z.literal('').transform(() => undefined)),
})

export type CreateReviewInput = z.infer<typeof createReviewSchema>

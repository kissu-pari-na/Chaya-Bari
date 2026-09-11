import { z } from 'zod'

const priceSchema = z
  .number({ invalid_type_error: 'Price must be a number' })
  .positive('Price must be greater than 0')
  .max(1_000_000, 'Price is too large')

const nullableText = z
  .string()
  .max(2000)
  .optional()
  .or(z.literal('').transform(() => undefined))

export const createProductSchema = z.object({
  name: z.string().min(1, 'Name is required').max(150),
  description: nullableText,
  imageUrl: z.string().url('Image must be a valid URL').max(2000).optional().or(z.literal('').transform(() => undefined)),
  price: priceSchema,
  categoryId: z.string().cuid().optional().or(z.literal('').transform(() => undefined)),
  prepInfo: nullableText,
  isActive: z.boolean().optional(),
  isAvailable: z.boolean().optional(),
})

// All fields optional for a partial update.
export const updateProductSchema = createProductSchema.partial()

export const createCategorySchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  sortOrder: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
})

export const updateCategorySchema = createCategorySchema.partial()

export type CreateProductInput = z.infer<typeof createProductSchema>
export type UpdateProductInput = z.infer<typeof updateProductSchema>
export type CreateCategoryInput = z.infer<typeof createCategorySchema>
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>

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

// Accept either a fully-qualified URL (http/https) or a root-relative path
// such as `/products/daab-pudding.png` for images served from the app's
// public folder.
const imageUrlSchema = z
  .string()
  .max(2000)
  .refine(
    (value) => value.startsWith('/') || z.string().url().safeParse(value).success,
    'Image must be a valid URL',
  )
  .optional()
  .or(z.literal('').transform(() => undefined))

export const createProductSchema = z.object({
  name: z.string().min(1, 'Name is required').max(150),
  nameEnglish: z.string().max(150).optional().or(z.literal('').transform(() => undefined)),
  description: nullableText,
  imageUrl: imageUrlSchema,
  price: priceSchema,
  // null clears the sale price; a number sets it (must be below the price).
  salePrice: priceSchema.nullable().optional(),
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

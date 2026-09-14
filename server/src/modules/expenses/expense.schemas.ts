import { z } from 'zod'

const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD')

export const createCategorySchema = z.object({
  name: z.string().min(1, 'Name is required').max(80),
})

export const createExpenseSchema = z.object({
  categoryId: z.string().cuid(),
  amount: z.number().positive('Amount must be greater than 0').max(10_000_000),
  spentAt: dateString,
  description: z.string().min(1, 'Description is required').max(200),
  note: z
    .string()
    .max(300)
    .optional()
    .or(z.literal('').transform(() => undefined)),
})

export type CreateExpenseCategoryInput = z.infer<typeof createCategorySchema>
export type CreateExpenseInput = z.infer<typeof createExpenseSchema>

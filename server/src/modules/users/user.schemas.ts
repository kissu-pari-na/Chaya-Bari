import { z } from 'zod'

/// Admin-created accounts. Unlike public self-registration (always CUSTOMER),
/// an admin may pick the role.
export const createUserSchema = z.object({
  name: z.string().min(1, 'Name is required').max(150),
  email: z.string().email('A valid email is required').max(160),
  phone: z.string().min(6, 'A valid phone number is required').max(60),
  password: z.string().min(8, 'Password must be at least 8 characters').max(200),
  role: z.enum(['CUSTOMER', 'KITCHEN', 'ADMIN']),
})

export type CreateUserInput = z.infer<typeof createUserSchema>

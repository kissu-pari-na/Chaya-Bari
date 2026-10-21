import { z } from 'zod'

/// Admin-created accounts. Unlike public self-registration (always CUSTOMER),
/// an admin may pick the role. There is no password: the person signs in with
/// the Google account for this email (vault D-AUTH-004).
export const createUserSchema = z.object({
  name: z.string().min(1, 'Name is required').max(150),
  email: z.string().email('A valid email is required').max(160),
  phone: z.string().min(6, 'A valid phone number is required').max(60),
  role: z.enum(['CUSTOMER', 'KITCHEN', 'ADMIN']),
})

export type CreateUserInput = z.infer<typeof createUserSchema>

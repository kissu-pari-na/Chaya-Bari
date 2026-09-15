import { z } from 'zod'

export const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  email: z.string().email('A valid email is required').toLowerCase(),
  // Phone is required for delivery/contact, but it is not verified — the
  // account is confirmed by email.
  phone: z.string().min(6, 'A valid phone number is required').max(20),
  password: z.string().min(8, 'Password must be at least 8 characters').max(200),
})

// Login by email OR phone: the identifier is matched against whichever it looks
// like. Either way the account's email must be confirmed.
export const loginSchema = z.object({
  identifier: z.string().min(1, 'Email or phone is required'),
  password: z.string().min(1, 'Password is required'),
})

const codeField = z.string().min(4, 'Enter the code').max(10)

// Email confirmation is public: it happens before the first login, so it is
// keyed by the email address rather than an authenticated session.
export const verifyEmailSchema = z.object({
  email: z.string().email('A valid email is required').toLowerCase(),
  code: codeField,
})

export const resendEmailSchema = z.object({
  email: z.string().email('A valid email is required').toLowerCase(),
})

export type RegisterInput = z.infer<typeof registerSchema>
export type LoginInput = z.infer<typeof loginSchema>
export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>
export type ResendEmailInput = z.infer<typeof resendEmailSchema>

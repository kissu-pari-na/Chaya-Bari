import { z } from 'zod'

export const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  email: z.string().email('A valid email is required').toLowerCase(),
  // Phone is mandatory: the account is confirmed by mobile number.
  phone: z.string().min(6, 'A valid phone number is required').max(20),
  password: z.string().min(8, 'Password must be at least 8 characters').max(200),
})

// Login by email OR phone: the identifier is matched against whichever it looks
// like. The corresponding channel must be confirmed.
export const loginSchema = z.object({
  identifier: z.string().min(1, 'Email or phone is required'),
  password: z.string().min(1, 'Password is required'),
})

const codeField = z.string().min(4, 'Enter the code').max(10)

export const verifyPhoneSchema = z.object({
  phone: z.string().min(6).max(20),
  code: codeField,
})

export const resendPhoneSchema = z.object({
  phone: z.string().min(6).max(20),
})

export const verifyEmailSchema = z.object({
  code: codeField,
})

export type RegisterInput = z.infer<typeof registerSchema>
export type LoginInput = z.infer<typeof loginSchema>
export type VerifyPhoneInput = z.infer<typeof verifyPhoneSchema>
export type ResendPhoneInput = z.infer<typeof resendPhoneSchema>
export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>

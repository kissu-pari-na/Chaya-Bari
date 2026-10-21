import { z } from 'zod'

// Sign-in is Google only (vault D-AUTH-004): no register, password or email-code
// schemas.

// Update the signed-in user's own profile. Only the fields provided are changed;
// at least one must be present. Phone can be added (when missing at sign-up) or
// corrected here.
export const updateProfileSchema = z
  .object({
    name: z.string().min(2, 'Name must be at least 2 characters').max(100).optional(),
    phone: z.string().min(6, 'A valid phone number is required').max(20).optional(),
  })
  .refine((v) => v.name !== undefined || v.phone !== undefined, {
    message: 'Nothing to update',
  })

// Google Sign-In: the browser sends the ID token (a JWT credential) issued by
// Google Identity Services; the server verifies it.
export const googleAuthSchema = z.object({
  credential: z.string().min(10, 'Missing Google credential'),
})

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>
export type GoogleAuthInput = z.infer<typeof googleAuthSchema>

import { Router } from 'express'
import { validateBody, asyncHandler } from '../../middleware/validate.js'
import { authenticate } from '../../middleware/auth.js'
import { rateLimitByIp } from '../../middleware/rateLimit.js'
import { googleAuthSchema, updateProfileSchema } from './auth.schemas.js'
import * as authController from './auth.controller.js'

export const authRouter = Router()

// Per-IP throttle on sign-in (abuse): 30 attempts per 5 minutes from one IP.
const authThrottle = rateLimitByIp('auth-ip', 30, 5 * 60_000)

// Sign-in is Google only (vault D-AUTH-004): this one public endpoint verifies a
// Google ID token and logs the user in, creating a customer account on first use.
authRouter.post('/google', authThrottle, validateBody(googleAuthSchema), asyncHandler(authController.googleAuth))

authRouter.get('/me', authenticate, asyncHandler(authController.me))
authRouter.patch('/me', authenticate, validateBody(updateProfileSchema), asyncHandler(authController.updateMe))

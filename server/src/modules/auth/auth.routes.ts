import { Router } from 'express'
import { validateBody, asyncHandler } from '../../middleware/validate.js'
import { authenticate } from '../../middleware/auth.js'
import { rateLimitByIp } from '../../middleware/rateLimit.js'
import {
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resendEmailSchema,
  resetPasswordSchema,
  verifyEmailSchema,
} from './auth.schemas.js'
import * as authController from './auth.controller.js'

export const authRouter = Router()

// Per-IP throttle across the sensitive auth endpoints (brute-force / abuse):
// 30 attempts per 5 minutes from one IP.
const authThrottle = rateLimitByIp('auth-ip', 30, 5 * 60_000)

authRouter.post('/register', authThrottle, validateBody(registerSchema), asyncHandler(authController.register))
authRouter.post('/login', authThrottle, validateBody(loginSchema), asyncHandler(authController.login))

// Email confirmation (public — done before the first login).
authRouter.post('/verify-email', authThrottle, validateBody(verifyEmailSchema), asyncHandler(authController.verifyEmail))
authRouter.post('/resend-email', authThrottle, validateBody(resendEmailSchema), asyncHandler(authController.resendEmail))

// Password reset (public).
authRouter.post('/forgot-password', authThrottle, validateBody(forgotPasswordSchema), asyncHandler(authController.forgotPassword))
authRouter.post('/reset-password', authThrottle, validateBody(resetPasswordSchema), asyncHandler(authController.resetPassword))

authRouter.get('/me', authenticate, asyncHandler(authController.me))

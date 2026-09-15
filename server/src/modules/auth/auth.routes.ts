import { Router } from 'express'
import { validateBody, asyncHandler } from '../../middleware/validate.js'
import { authenticate } from '../../middleware/auth.js'
import {
  loginSchema,
  registerSchema,
  resendPhoneSchema,
  verifyEmailSchema,
  verifyPhoneSchema,
} from './auth.schemas.js'
import * as authController from './auth.controller.js'

export const authRouter = Router()

authRouter.post('/register', validateBody(registerSchema), asyncHandler(authController.register))
authRouter.post('/login', validateBody(loginSchema), asyncHandler(authController.login))

// Phone confirmation (public — done before the first login).
authRouter.post('/verify-phone', validateBody(verifyPhoneSchema), asyncHandler(authController.verifyPhone))
authRouter.post('/resend-phone', validateBody(resendPhoneSchema), asyncHandler(authController.resendPhone))

// Email confirmation (authenticated — the user can confirm any time).
authRouter.post('/email/send-code', authenticate, asyncHandler(authController.sendEmailCode))
authRouter.post('/email/verify', authenticate, validateBody(verifyEmailSchema), asyncHandler(authController.verifyEmail))

authRouter.get('/me', authenticate, asyncHandler(authController.me))

import { Router } from 'express'
import { validateBody, asyncHandler } from '../../middleware/validate.js'
import { authenticate } from '../../middleware/auth.js'
import { loginSchema, registerSchema } from './auth.schemas.js'
import * as authController from './auth.controller.js'

export const authRouter = Router()

authRouter.post('/register', validateBody(registerSchema), asyncHandler(authController.register))
authRouter.post('/login', validateBody(loginSchema), asyncHandler(authController.login))
authRouter.get('/me', authenticate, asyncHandler(authController.me))

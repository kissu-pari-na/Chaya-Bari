import { Router } from 'express'
import { asyncHandler, validateBody } from '../../middleware/validate.js'
import { authenticate, requireRole } from '../../middleware/auth.js'
import { createUserSchema } from './user.schemas.js'
import * as userController from './user.controller.js'

/// Admin user management (ADMIN role required).
export const adminUserRouter = Router()
adminUserRouter.use(authenticate, requireRole('ADMIN'))

adminUserRouter.get('/users', asyncHandler(userController.listUsers))
adminUserRouter.post('/users', validateBody(createUserSchema), asyncHandler(userController.createUser))

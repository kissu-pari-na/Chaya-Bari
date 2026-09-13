import { Router } from 'express'
import { asyncHandler, validateBody } from '../../middleware/validate.js'
import { authenticate, requireRole } from '../../middleware/auth.js'
import { businessProfileSchema } from './business.schemas.js'
import * as businessController from './business.controller.js'

/// Public business identity (name/logo/contact/etc.), read by every client.
export const publicBusinessRouter = Router()
publicBusinessRouter.get('/business-profile', asyncHandler(businessController.get))

/// Admin: update the business profile.
export const adminBusinessRouter = Router()
adminBusinessRouter.use(authenticate, requireRole('ADMIN'))
adminBusinessRouter.put(
  '/business-profile',
  validateBody(businessProfileSchema),
  asyncHandler(businessController.update),
)

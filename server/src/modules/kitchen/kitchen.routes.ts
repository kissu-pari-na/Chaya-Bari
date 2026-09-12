import { Router } from 'express'
import { asyncHandler, validateBody } from '../../middleware/validate.js'
import { authenticate, requireRole } from '../../middleware/auth.js'
import { updateKitchenStatusSchema } from './kitchen.schemas.js'
import * as kitchenController from './kitchen.controller.js'

/// Kitchen production. Accessible to KITCHEN and ADMIN roles.
export const kitchenRouter = Router()
kitchenRouter.use(authenticate, requireRole('KITCHEN', 'ADMIN'))

kitchenRouter.get('/kitchen/dates', asyncHandler(kitchenController.dates))
kitchenRouter.get('/kitchen/production', asyncHandler(kitchenController.production))
kitchenRouter.patch(
  '/kitchen/production/status',
  validateBody(updateKitchenStatusSchema),
  asyncHandler(kitchenController.updateStatus),
)

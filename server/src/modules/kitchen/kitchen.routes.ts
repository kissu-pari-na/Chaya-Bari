import { Router } from 'express'
import { asyncHandler, validateBody } from '../../middleware/validate.js'
import { authenticate, requireRole } from '../../middleware/auth.js'
import { setOrderStageSchema } from './kitchen.schemas.js'
import * as kitchenController from './kitchen.controller.js'

/// Kitchen production. Mounted at /kitchen and accessible to KITCHEN and ADMIN.
export const kitchenRouter = Router()
kitchenRouter.use(authenticate, requireRole('KITCHEN', 'ADMIN'))

kitchenRouter.get('/dates', asyncHandler(kitchenController.dates))
kitchenRouter.get('/production', asyncHandler(kitchenController.production))
kitchenRouter.patch(
  '/orders/:id/stage',
  validateBody(setOrderStageSchema),
  asyncHandler(kitchenController.setStage),
)

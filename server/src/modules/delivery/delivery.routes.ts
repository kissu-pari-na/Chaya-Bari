import { Router } from 'express'
import { asyncHandler, validateBody } from '../../middleware/validate.js'
import { authenticate, requireRole } from '../../middleware/auth.js'
import { updateDeliverySchema } from './delivery.schemas.js'
import * as deliveryController from './delivery.controller.js'

/// Admin delivery management.
export const adminDeliveryRouter = Router()
adminDeliveryRouter.use(authenticate, requireRole('ADMIN'))

adminDeliveryRouter.get('/deliveries', asyncHandler(deliveryController.list))
adminDeliveryRouter.get('/orders/:id/delivery', asyncHandler(deliveryController.getForOrder))
adminDeliveryRouter.post('/orders/:id/delivery', asyncHandler(deliveryController.createForOrder))
adminDeliveryRouter.patch(
  '/deliveries/:id',
  validateBody(updateDeliverySchema),
  asyncHandler(deliveryController.update),
)
// Mock provider dispatch (integration point for Pathao/pandago).
adminDeliveryRouter.post('/deliveries/:id/dispatch', asyncHandler(deliveryController.dispatch))

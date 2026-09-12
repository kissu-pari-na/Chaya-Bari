import { Router } from 'express'
import { asyncHandler, validateBody } from '../../middleware/validate.js'
import { authenticate, requireRole } from '../../middleware/auth.js'
import { gatewayChargeSchema, recordPaymentSchema } from './payment.schemas.js'
import * as paymentController from './payment.controller.js'

/// Admin payment management.
export const adminPaymentRouter = Router()
adminPaymentRouter.use(authenticate, requireRole('ADMIN'))

adminPaymentRouter.get('/orders/:id/payments', asyncHandler(paymentController.list))
adminPaymentRouter.post(
  '/orders/:id/payments',
  validateBody(recordPaymentSchema),
  asyncHandler(paymentController.record),
)
adminPaymentRouter.post(
  '/orders/:id/payments/gateway',
  validateBody(gatewayChargeSchema),
  asyncHandler(paymentController.gatewayCharge),
)
adminPaymentRouter.delete('/payments/:id', asyncHandler(paymentController.remove))

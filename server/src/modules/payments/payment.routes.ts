import { Router } from 'express'
import { asyncHandler, validateBody } from '../../middleware/validate.js'
import { authenticate, requireRole } from '../../middleware/auth.js'
import {
  bkashCreateSchema,
  bkashExecuteSchema,
  claimPaymentSchema,
  recordPaymentSchema,
  verifyPaymentSchema,
} from './payment.schemas.js'
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
adminPaymentRouter.patch(
  '/payments/:id/verify',
  validateBody(verifyPaymentSchema),
  asyncHandler(paymentController.verify),
)
adminPaymentRouter.delete('/payments/:id', asyncHandler(paymentController.remove))

/// Customer payment actions (own orders): manual claim + bKash online payment.
export const customerPaymentRouter = Router()
customerPaymentRouter.use(authenticate)

customerPaymentRouter.post(
  '/orders/:id/payments/claim',
  validateBody(claimPaymentSchema),
  asyncHandler(paymentController.claim),
)
customerPaymentRouter.post(
  '/orders/:id/payments/bkash/create',
  validateBody(bkashCreateSchema),
  asyncHandler(paymentController.bkashCreate),
)
customerPaymentRouter.post(
  '/orders/:id/payments/bkash/execute',
  validateBody(bkashExecuteSchema),
  asyncHandler(paymentController.bkashExecute),
)

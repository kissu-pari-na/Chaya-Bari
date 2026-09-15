import { Router } from 'express'
import { asyncHandler, validateBody } from '../../middleware/validate.js'
import { authenticate, requireRole } from '../../middleware/auth.js'
import {
  bkashCreateSchema,
  bkashExecuteSchema,
  claimPaymentSchema,
  paymentSettingSchema,
  recordPaymentSchema,
  refundPaymentSchema,
  verifyPaymentSchema,
  voidPaymentSchema,
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
// Payments are never deleted — void (recorded in error) or refund (money
// returned) instead, both keeping the row for audit.
adminPaymentRouter.post(
  '/payments/:id/void',
  validateBody(voidPaymentSchema),
  asyncHandler(paymentController.voidPayment),
)
adminPaymentRouter.post(
  '/payments/:id/refund',
  validateBody(refundPaymentSchema),
  asyncHandler(paymentController.refund),
)
adminPaymentRouter.put(
  '/payment-info',
  validateBody(paymentSettingSchema),
  asyncHandler(paymentController.updatePaymentInfo),
)

/// Public payment-account details (shown to customers at payment time).
export const publicPaymentRouter = Router()
publicPaymentRouter.get('/payment-info', asyncHandler(paymentController.getPaymentInfo))

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

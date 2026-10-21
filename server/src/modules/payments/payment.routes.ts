import { Router } from 'express'
import { asyncHandler, validateBody } from '../../middleware/validate.js'
import { authenticate, requireRole } from '../../middleware/auth.js'
import { paymentSettingSchema } from './payment.schemas.js'
import * as paymentController from './payment.controller.js'

// Money movements live in the wallet module (vault node: wallet). This module
// only holds the business's payment-account details (bKash/Nagad/Rocket/bank)
// that customers pay to manually.

/// Admin edits the payment-account details.
export const adminPaymentRouter = Router()
adminPaymentRouter.use(authenticate, requireRole('ADMIN'))
adminPaymentRouter.put('/payment-info', validateBody(paymentSettingSchema), asyncHandler(paymentController.updatePaymentInfo))

/// Public payment-account details (shown to customers at payment time).
export const publicPaymentRouter = Router()
publicPaymentRouter.get('/payment-info', asyncHandler(paymentController.getPaymentInfo))

import { Router } from 'express'
import { asyncHandler, validateBody } from '../../middleware/validate.js'
import { authenticate, requireRole } from '../../middleware/auth.js'
import {
  addressSchema,
  adminCheckoutSchema,
  checkoutSchema,
  guestCheckoutSchema,
  updateAddressSchema,
  updateOrderingSettingSchema,
  updatePaymentModeSchema,
  updatePaymentStatusSchema,
  updateStatusSchema,
} from './order.schemas.js'
import * as orderController from './order.controller.js'
import * as adminOrderController from './admin-order.controller.js'

/// Public ordering routes (no authentication). Guest checkout lets someone
/// order without an account.
export const publicOrderRouter = Router()
// Ordering window (delivery cost, cutoff, earliest date) — needed by guests too.
publicOrderRouter.get('/ordering/window', asyncHandler(orderController.getWindow))
publicOrderRouter.post(
  '/guest/orders',
  validateBody(guestCheckoutSchema),
  asyncHandler(orderController.guestCheckout),
)

/// Customer ordering routes. All require authentication; the controller further
/// requires a customer profile so admin/kitchen accounts can't place orders.
export const orderRouter = Router()
orderRouter.use(authenticate)

// Addresses.
orderRouter.get('/addresses', asyncHandler(orderController.listAddresses))
orderRouter.post('/addresses', validateBody(addressSchema), asyncHandler(orderController.createAddress))
orderRouter.patch(
  '/addresses/:id',
  validateBody(updateAddressSchema),
  asyncHandler(orderController.updateAddress),
)
orderRouter.delete('/addresses/:id', asyncHandler(orderController.deleteAddress))

// Orders (own).
orderRouter.post('/orders', validateBody(checkoutSchema), asyncHandler(orderController.checkout))
orderRouter.get('/orders', asyncHandler(orderController.listMyOrders))
orderRouter.get('/orders/:id', asyncHandler(orderController.getMyOrder))
orderRouter.patch(
  '/orders/:id/payment-mode',
  validateBody(updatePaymentModeSchema),
  asyncHandler(orderController.changePaymentMode),
)
orderRouter.post('/orders/:id/cancel', asyncHandler(orderController.cancelOrder))

/// Admin ordering settings + order management.
export const adminOrderingRouter = Router()
adminOrderingRouter.use(authenticate, requireRole('ADMIN'))
adminOrderingRouter.get('/ordering-settings', asyncHandler(orderController.getSetting))
adminOrderingRouter.put(
  '/ordering-settings',
  validateBody(updateOrderingSettingSchema),
  asyncHandler(orderController.updateSetting),
)

adminOrderingRouter.get('/orders', asyncHandler(adminOrderController.list))
// Place an order on a customer's behalf, by email (opens a placeholder account
// when the email has none).
adminOrderingRouter.post('/orders', validateBody(adminCheckoutSchema), asyncHandler(adminOrderController.create))
adminOrderingRouter.get('/customers/lookup', asyncHandler(adminOrderController.lookupCustomer))
adminOrderingRouter.get('/orders/:id', asyncHandler(adminOrderController.get))
adminOrderingRouter.patch(
  '/orders/:id/status',
  validateBody(updateStatusSchema),
  asyncHandler(adminOrderController.updateStatus),
)
adminOrderingRouter.patch(
  '/orders/:id/payment-status',
  validateBody(updatePaymentStatusSchema),
  asyncHandler(adminOrderController.updatePaymentStatus),
)
adminOrderingRouter.patch(
  '/orders/:id/payment-mode',
  validateBody(updatePaymentModeSchema),
  asyncHandler(adminOrderController.updatePaymentMode),
)

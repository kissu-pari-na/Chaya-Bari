import { Router } from 'express'
import { asyncHandler, validateBody } from '../../middleware/validate.js'
import { authenticate, requireRole } from '../../middleware/auth.js'
import {
  addressSchema,
  checkoutSchema,
  updateAddressSchema,
  updateOrderingSettingSchema,
} from './order.schemas.js'
import * as orderController from './order.controller.js'

/// Customer ordering routes. All require authentication; the controller further
/// requires a customer profile so admin/kitchen accounts can't place orders.
export const orderRouter = Router()
orderRouter.use(authenticate)

// Ordering window (delivery cost, cutoff, earliest date).
orderRouter.get('/ordering/window', asyncHandler(orderController.getWindow))

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

/// Admin ordering settings (cutoff, delivery cost).
export const adminOrderingRouter = Router()
adminOrderingRouter.use(authenticate, requireRole('ADMIN'))
adminOrderingRouter.get('/ordering-settings', asyncHandler(orderController.getSetting))
adminOrderingRouter.put(
  '/ordering-settings',
  validateBody(updateOrderingSettingSchema),
  asyncHandler(orderController.updateSetting),
)

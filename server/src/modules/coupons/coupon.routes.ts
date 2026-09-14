import { Router } from 'express'
import { asyncHandler, validateBody } from '../../middleware/validate.js'
import { authenticate, requireRole } from '../../middleware/auth.js'
import { applyCouponSchema, createCouponSchema, updateCouponSchema } from './coupon.schemas.js'
import * as couponController from './coupon.controller.js'

/// Customer-facing coupon preview (auth required).
export const couponRouter = Router()
couponRouter.use(authenticate)
couponRouter.post('/coupons/preview', validateBody(applyCouponSchema), asyncHandler(couponController.preview))

/// Admin coupon management.
export const adminCouponRouter = Router()
adminCouponRouter.use(authenticate, requireRole('ADMIN'))
adminCouponRouter.get('/coupons', asyncHandler(couponController.list))
adminCouponRouter.post('/coupons', validateBody(createCouponSchema), asyncHandler(couponController.create))
adminCouponRouter.put('/coupons/:id', validateBody(updateCouponSchema), asyncHandler(couponController.update))
adminCouponRouter.delete('/coupons/:id', asyncHandler(couponController.remove))

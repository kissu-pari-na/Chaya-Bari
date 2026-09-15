import { Router } from 'express'
import { healthRouter } from './modules/health/health.routes.js'
import { authRouter } from './modules/auth/auth.routes.js'
import { publicProductRouter, adminProductRouter } from './modules/products/product.routes.js'
import { orderRouter, adminOrderingRouter } from './modules/orders/order.routes.js'
import { couponRouter, adminCouponRouter } from './modules/coupons/coupon.routes.js'
import { kitchenRouter } from './modules/kitchen/kitchen.routes.js'
import { adminDeliveryRouter } from './modules/delivery/delivery.routes.js'
import { adminPaymentRouter, customerPaymentRouter, publicPaymentRouter } from './modules/payments/payment.routes.js'
import { adminInventoryRouter } from './modules/inventory/inventory.routes.js'
import { adminExpenseRouter } from './modules/expenses/expense.routes.js'
import { adminAnalyticsRouter } from './modules/analytics/analytics.routes.js'
import { notificationRouter } from './modules/notifications/notification.routes.js'
import { adminBusinessRouter, publicBusinessRouter } from './modules/business/business.routes.js'
import { reviewRouter } from './modules/reviews/review.routes.js'
import { translateRouter } from './modules/translate/translate.routes.js'
import { adminUserRouter } from './modules/users/user.routes.js'

/// Root API router. Each module mounts its own sub-router here.
export const apiRouter = Router()

apiRouter.use('/health', healthRouter)
apiRouter.use('/auth', authRouter)

// Public best-effort translation (fallback for single-language content).
apiRouter.use('/', translateRouter)

// Products: public browsing under /api, admin management under /api/admin.
apiRouter.use('/', publicProductRouter)
apiRouter.use('/admin', adminProductRouter)

// Product reviews & ratings. Public reads + customer submit (per-route auth),
// so it is safe to mount alongside the public product routes.
apiRouter.use('/', reviewRouter)

// Public payment-account details. Must precede routers that mount at '/' with a
// blanket authenticate (order/customer-payment), or their auth gate would 401
// this public GET before it is reached.
apiRouter.use('/', publicPaymentRouter)

// Public business identity (read by every client); same ordering requirement.
apiRouter.use('/', publicBusinessRouter)

// Ordering: customer addresses/orders under /api, admin settings under /api/admin.
apiRouter.use('/', orderRouter)
apiRouter.use('/admin', adminOrderingRouter)

// Coupons: customer preview under /api, admin management under /api/admin.
apiRouter.use('/', couponRouter)
apiRouter.use('/admin', adminCouponRouter)

// Kitchen production (KITCHEN + ADMIN). Mounted under /kitchen so its role
// gate applies only to kitchen paths, not to every fall-through request.
apiRouter.use('/kitchen', kitchenRouter)

// Delivery management (ADMIN).
apiRouter.use('/admin', adminDeliveryRouter)

// Payment management (ADMIN).
apiRouter.use('/admin', adminPaymentRouter)

// Customer payment actions (own orders): manual claim + bKash online payment.
apiRouter.use('/', customerPaymentRouter)

// Inventory & costing (ADMIN).
apiRouter.use('/admin', adminInventoryRouter)

// Expenses (ADMIN).
apiRouter.use('/admin', adminExpenseRouter)

// Analytics & reports (ADMIN).
apiRouter.use('/admin', adminAnalyticsRouter)

// Business profile management (ADMIN).
apiRouter.use('/admin', adminBusinessRouter)

// User management (ADMIN): create staff/customer accounts with a creator footprint.
apiRouter.use('/admin', adminUserRouter)

// Notifications (any authenticated user).
apiRouter.use('/', notificationRouter)

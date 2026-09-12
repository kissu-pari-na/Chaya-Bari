import { Router } from 'express'
import { asyncHandler } from '../../middleware/validate.js'
import { authenticate, requireRole } from '../../middleware/auth.js'
import * as analyticsController from './analytics.controller.js'

export const adminAnalyticsRouter = Router()
adminAnalyticsRouter.use(authenticate, requireRole('ADMIN'))

adminAnalyticsRouter.get('/reports/summary', asyncHandler(analyticsController.summary))
adminAnalyticsRouter.get('/reports/products', asyncHandler(analyticsController.products))
adminAnalyticsRouter.get('/reports/customers', asyncHandler(analyticsController.customers))
adminAnalyticsRouter.get('/reports/demand-profit', asyncHandler(analyticsController.demandProfit))
adminAnalyticsRouter.get('/reports/sales-by-day', asyncHandler(analyticsController.salesByDay))
adminAnalyticsRouter.get('/orders/:id/contribution', asyncHandler(analyticsController.contribution))

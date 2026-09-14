import { Router } from 'express'
import { asyncHandler, validateBody } from '../../middleware/validate.js'
import { authenticate } from '../../middleware/auth.js'
import { submitOrderReviewsSchema } from './review.schemas.js'
import * as reviewController from './review.controller.js'

/// Product reviews & ratings. Public reads are open; reviews can only be
/// *created* from an order's review page (never from the product page).
/// `authenticate` is applied per-route so the public GETs stay open and
/// mounting order at '/' does not 401 unrelated requests.
export const reviewRouter = Router()

// Public reads.
reviewRouter.get('/reviews/top', asyncHandler(reviewController.listTop))
reviewRouter.get('/reviews/summary', asyncHandler(reviewController.siteSummary))
reviewRouter.get('/products/:id/reviews', asyncHandler(reviewController.listForProduct))

// Order-based review page (authenticated; own order only).
reviewRouter.get(
  '/orders/:orderId/review',
  authenticate,
  asyncHandler(reviewController.getOrderReview),
)
reviewRouter.post(
  '/orders/:orderId/reviews',
  authenticate,
  validateBody(submitOrderReviewsSchema),
  asyncHandler(reviewController.submitOrderReviews),
)

import { Router } from 'express'
import { asyncHandler, validateBody } from '../../middleware/validate.js'
import { authenticate } from '../../middleware/auth.js'
import { createReviewSchema } from './review.schemas.js'
import * as reviewController from './review.controller.js'

/// Product reviews & ratings. Public reads plus customer submit. `authenticate`
/// is applied per-route (not as blanket router middleware) so the public GETs
/// stay open and mounting order at '/' does not 401 unrelated requests.
export const reviewRouter = Router()

// Public reads.
reviewRouter.get('/reviews/top', asyncHandler(reviewController.listTop))
reviewRouter.get('/reviews/summary', asyncHandler(reviewController.siteSummary))
reviewRouter.get('/products/:id/reviews', asyncHandler(reviewController.listForProduct))

// Customer's own review + submit (authenticated).
reviewRouter.get('/products/:id/reviews/me', authenticate, asyncHandler(reviewController.getMine))
reviewRouter.post(
  '/products/:id/reviews',
  authenticate,
  validateBody(createReviewSchema),
  asyncHandler(reviewController.submit),
)

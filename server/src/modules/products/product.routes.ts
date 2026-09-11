import { Router } from 'express'
import { asyncHandler, validateBody } from '../../middleware/validate.js'
import { authenticate, requireRole } from '../../middleware/auth.js'
import {
  createCategorySchema,
  createProductSchema,
  updateCategorySchema,
  updateProductSchema,
} from './product.schemas.js'
import * as productController from './product.controller.js'

/// Public product browsing (no auth). Only active + available items are exposed.
export const publicProductRouter = Router()
publicProductRouter.get('/products', asyncHandler(productController.listPublicProducts))
publicProductRouter.get('/products/:id', asyncHandler(productController.getPublicProduct))
publicProductRouter.get('/categories', asyncHandler(productController.listPublicCategories))

/// Admin catalog management (ADMIN role required).
export const adminProductRouter = Router()
adminProductRouter.use(authenticate, requireRole('ADMIN'))

adminProductRouter.get('/products', asyncHandler(productController.listAdminProducts))
adminProductRouter.get('/products/:id', asyncHandler(productController.getAdminProduct))
adminProductRouter.post(
  '/products',
  validateBody(createProductSchema),
  asyncHandler(productController.createProduct),
)
adminProductRouter.patch(
  '/products/:id',
  validateBody(updateProductSchema),
  asyncHandler(productController.updateProduct),
)
adminProductRouter.delete('/products/:id', asyncHandler(productController.deleteProduct))

adminProductRouter.get('/categories', asyncHandler(productController.listAdminCategories))
adminProductRouter.post(
  '/categories',
  validateBody(createCategorySchema),
  asyncHandler(productController.createCategory),
)
adminProductRouter.patch(
  '/categories/:id',
  validateBody(updateCategorySchema),
  asyncHandler(productController.updateCategory),
)
adminProductRouter.delete('/categories/:id', asyncHandler(productController.deleteCategory))

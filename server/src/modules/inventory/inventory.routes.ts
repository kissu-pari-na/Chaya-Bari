import { Router } from 'express'
import { asyncHandler, validateBody } from '../../middleware/validate.js'
import { authenticate, requireRole } from '../../middleware/auth.js'
import {
  adjustStockSchema,
  createMaterialSchema,
  createPurchaseSchema,
  updateMaterialSchema,
  upsertRecipeSchema,
} from './inventory.schemas.js'
import * as inventoryController from './inventory.controller.js'

/// Admin inventory & costing.
export const adminInventoryRouter = Router()
adminInventoryRouter.use(authenticate, requireRole('ADMIN'))

// Materials.
adminInventoryRouter.get('/materials', asyncHandler(inventoryController.listMaterials))
adminInventoryRouter.post('/materials', validateBody(createMaterialSchema), asyncHandler(inventoryController.createMaterial))
adminInventoryRouter.patch('/materials/:id', validateBody(updateMaterialSchema), asyncHandler(inventoryController.updateMaterial))
adminInventoryRouter.delete('/materials/:id', asyncHandler(inventoryController.deleteMaterial))
adminInventoryRouter.post('/materials/:id/adjust', validateBody(adjustStockSchema), asyncHandler(inventoryController.adjustStock))

// Purchases.
adminInventoryRouter.get('/purchases', asyncHandler(inventoryController.listPurchases))
adminInventoryRouter.post('/purchases', validateBody(createPurchaseSchema), asyncHandler(inventoryController.createPurchase))

// Recipes & costing.
adminInventoryRouter.get('/costing', asyncHandler(inventoryController.listCosting))
adminInventoryRouter.get('/products/:id/recipe', asyncHandler(inventoryController.getRecipe))
adminInventoryRouter.put('/products/:id/recipe', validateBody(upsertRecipeSchema), asyncHandler(inventoryController.upsertRecipe))
adminInventoryRouter.delete('/products/:id/recipe', asyncHandler(inventoryController.deleteRecipe))

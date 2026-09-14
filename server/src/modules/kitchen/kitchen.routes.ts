import { Router } from 'express'
import { asyncHandler, validateBody } from '../../middleware/validate.js'
import { authenticate, requireRole } from '../../middleware/auth.js'
import { bulkMoveSchema, moveLineSchema, packOrderSchema } from './kitchen.schemas.js'
import * as kitchenController from './kitchen.controller.js'

/// Kitchen production. Mounted at /kitchen and accessible to KITCHEN and ADMIN.
export const kitchenRouter = Router()
kitchenRouter.use(authenticate, requireRole('KITCHEN', 'ADMIN'))

kitchenRouter.get('/dates', asyncHandler(kitchenController.dates))
kitchenRouter.get('/production', asyncHandler(kitchenController.production))
// Per-order, per-product move.
kitchenRouter.patch('/lines/:id/stage', validateBody(moveLineSchema), asyncHandler(kitchenController.moveLine))
// Product-wise bulk move across all orders for a day.
kitchenRouter.post('/products/move', validateBody(bulkMoveSchema), asyncHandler(kitchenController.bulkMove))
// Pack / un-pack a ready order (order-level step after cooking).
kitchenRouter.patch('/orders/:id/pack', validateBody(packOrderSchema), asyncHandler(kitchenController.pack))

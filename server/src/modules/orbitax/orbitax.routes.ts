import { Router } from 'express'
import { asyncHandler, validateBody } from '../../middleware/validate.js'
import { authenticate } from '../../middleware/auth.js'
import { orbitaxPaySchema } from './orbitax.schemas.js'
import * as orbitaxController from './orbitax.controller.js'

/// Orbitax staff self-service billing (own account). Access is gated in the
/// service by the user's email domain, so this only needs authentication.
export const orbitaxRouter = Router()
orbitaxRouter.use(authenticate)

orbitaxRouter.get('/orbitax/account', asyncHandler(orbitaxController.getAccount))
orbitaxRouter.post('/orbitax/pay', validateBody(orbitaxPaySchema), asyncHandler(orbitaxController.pay))

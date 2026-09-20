import { Router } from 'express'
import { asyncHandler, validateBody } from '../../middleware/validate.js'
import { authenticate } from '../../middleware/auth.js'
import { subscribeSchema, unsubscribeSchema } from './push.schemas.js'
import * as pushController from './push.controller.js'

/// Web Push. The public key is public; managing a subscription requires auth
/// (it is tied to the signed-in user's account).
export const pushRouter = Router()

pushRouter.get('/push/public-key', asyncHandler(pushController.getPublicKey))
pushRouter.post('/push/subscribe', authenticate, validateBody(subscribeSchema), asyncHandler(pushController.subscribe))
pushRouter.post('/push/unsubscribe', authenticate, validateBody(unsubscribeSchema), asyncHandler(pushController.unsubscribe))

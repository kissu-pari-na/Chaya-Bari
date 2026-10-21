import { Router } from 'express'
import { asyncHandler, validateBody } from '../../middleware/validate.js'
import { authenticate, requireRole } from '../../middleware/auth.js'
import { adjustSchema, claimSchema, recordPaymentSchema, redeemSchema, reviewSchema } from './wallet.schemas.js'
import * as walletController from './wallet.controller.js'

/// Customer wallet (own account). Mounted under /wallet so its auth gate only
/// covers wallet paths.
export const walletRouter = Router()
walletRouter.use(authenticate)
walletRouter.get('/', asyncHandler(walletController.mine))
walletRouter.post('/claims', validateBody(claimSchema), asyncHandler(walletController.claim))
walletRouter.post('/redeem', validateBody(redeemSchema), asyncHandler(walletController.redeem))

/// Admin wallet management.
export const adminWalletRouter = Router()
adminWalletRouter.use(authenticate, requireRole('ADMIN'))
adminWalletRouter.get('/wallets', asyncHandler(walletController.list))
adminWalletRouter.get('/wallets/claims', asyncHandler(walletController.claims))
adminWalletRouter.get('/wallets/:customerId', asyncHandler(walletController.detail))
adminWalletRouter.post('/wallets/:customerId/adjust', validateBody(adjustSchema), asyncHandler(walletController.adjust))
adminWalletRouter.post('/wallet-entries/:id/review', validateBody(reviewSchema), asyncHandler(walletController.review))
adminWalletRouter.post('/orders/:id/payments', validateBody(recordPaymentSchema), asyncHandler(walletController.recordOrderPayment))

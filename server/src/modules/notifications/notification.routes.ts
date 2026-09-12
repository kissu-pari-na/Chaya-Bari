import { Router } from 'express'
import { asyncHandler } from '../../middleware/validate.js'
import { authenticate } from '../../middleware/auth.js'
import * as notificationService from './notification.service.js'

/// In-app notifications for the authenticated user (any role).
export const notificationRouter = Router()
notificationRouter.use(authenticate)

notificationRouter.get(
  '/notifications',
  asyncHandler(async (req, res) => {
    res.json(await notificationService.listForUser(req.user!.id))
  }),
)

notificationRouter.post(
  '/notifications/:id/read',
  asyncHandler(async (req, res) => {
    await notificationService.markRead(req.user!.id, req.params.id)
    res.status(204).send()
  }),
)

notificationRouter.post(
  '/notifications/read-all',
  asyncHandler(async (req, res) => {
    await notificationService.markAllRead(req.user!.id)
    res.status(204).send()
  }),
)

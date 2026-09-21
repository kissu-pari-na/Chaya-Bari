import { Router } from 'express'
import { asyncHandler } from '../../middleware/validate.js'
import { authenticate } from '../../middleware/auth.js'
import { parsePageParams } from '../../lib/pagination.js'
import * as notificationService from './notification.service.js'

/// In-app notifications for the authenticated user (any role).
export const notificationRouter = Router()
notificationRouter.use(authenticate)

notificationRouter.get(
  '/notifications',
  asyncHandler(async (req, res) => {
    const page = parsePageParams(req, { maxLimit: 50 })
    res.json(await notificationService.listForUser(req.user!.id, page))
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

notificationRouter.delete(
  '/notifications',
  asyncHandler(async (req, res) => {
    await notificationService.clearAll(req.user!.id)
    res.status(204).send()
  }),
)

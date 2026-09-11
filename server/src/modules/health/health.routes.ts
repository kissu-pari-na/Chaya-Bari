import { Router } from 'express'
import { asyncHandler } from '../../middleware/validate.js'
import { prisma } from '../../lib/prisma.js'

export const healthRouter = Router()

healthRouter.get('/', (_req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() })
})

// Verifies the database connection.
healthRouter.get(
  '/db',
  asyncHandler(async (_req, res) => {
    await prisma.$queryRaw`SELECT 1`
    res.json({ status: 'ok', database: 'reachable' })
  }),
)

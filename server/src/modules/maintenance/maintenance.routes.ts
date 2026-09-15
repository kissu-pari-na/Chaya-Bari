import { Router } from 'express'
import type { Request, Response } from 'express'
import { asyncHandler } from '../../middleware/validate.js'
import { env } from '../../config/env.js'
import { HttpError } from '../../utils/httpError.js'
import { runMaintenance } from './maintenance.service.js'

export const maintenanceRouter = Router()

// Verify the caller is the cron trigger (Vercel Cron sends the secret as a
// Bearer token when CRON_SECRET is configured). Disabled entirely if no secret
// is set, so the endpoint is never publicly triggerable.
function assertCron(req: Request): void {
  if (!env.cronSecret) {
    throw new HttpError(503, 'Maintenance endpoint is not configured')
  }
  const header = req.headers.authorization ?? ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : ''
  if (token !== env.cronSecret) {
    throw new HttpError(401, 'Unauthorized')
  }
}

async function handle(req: Request, res: Response) {
  assertCron(req)
  const report = await runMaintenance()
  res.status(200).json({ ok: true, ...report })
}

// Vercel Cron issues GET; POST is accepted for manual/CLI triggering.
maintenanceRouter.get('/maintenance', asyncHandler(handle))
maintenanceRouter.post('/maintenance', asyncHandler(handle))

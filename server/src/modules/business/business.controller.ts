import type { Request, Response } from 'express'
import * as businessService from './business.service.js'

/// Public: the business identity shown across the app.
export async function get(_req: Request, res: Response) {
  res.json({ profile: await businessService.getBusinessProfile() })
}

/// Admin: replace the business identity.
export async function update(req: Request, res: Response) {
  res.json({ profile: await businessService.updateBusinessProfile(req.body) })
}

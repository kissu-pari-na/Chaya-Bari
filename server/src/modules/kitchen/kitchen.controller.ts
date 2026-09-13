import type { Request, Response } from 'express'
import { HttpError } from '../../utils/httpError.js'
import * as kitchenService from './kitchen.service.js'

export async function dates(_req: Request, res: Response) {
  res.json({ dates: await kitchenService.listProductionDates() })
}

export async function production(req: Request, res: Response) {
  const date = typeof req.query.date === 'string' ? req.query.date : ''
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw HttpError.badRequest('A valid ?date=YYYY-MM-DD is required')
  }
  res.json({ production: await kitchenService.getProductionDay(date) })
}

export async function setStage(req: Request, res: Response) {
  const order = await kitchenService.setOrderStage(req.params.id, req.body.status)
  res.json({ order })
}

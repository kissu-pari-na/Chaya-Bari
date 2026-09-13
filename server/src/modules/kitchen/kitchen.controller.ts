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

/// Move one order line to an adjacent stage.
export async function moveLine(req: Request, res: Response) {
  const production = await kitchenService.moveLine(req.params.id, req.body.stage)
  res.json({ production })
}

/// Move all lines of a product (on a day) from one stage to an adjacent one.
export async function bulkMove(req: Request, res: Response) {
  const { date, productId, from, to } = req.body
  const production = await kitchenService.bulkMoveProduct(date, productId, from, to)
  res.json({ production })
}

/// Pack (or un-pack) a ready order.
export async function pack(req: Request, res: Response) {
  const production = await kitchenService.packOrder(req.params.id, req.body.packed)
  res.json({ production })
}

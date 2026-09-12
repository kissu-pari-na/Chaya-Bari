import type { Request, Response } from 'express'
import * as deliveryService from './delivery.service.js'

export async function getForOrder(req: Request, res: Response) {
  res.json({ delivery: await deliveryService.getByOrder(req.params.id) })
}

export async function createForOrder(req: Request, res: Response) {
  const delivery = await deliveryService.ensureDelivery(req.params.id)
  res.status(201).json({ delivery })
}

export async function update(req: Request, res: Response) {
  res.json({ delivery: await deliveryService.updateDelivery(req.params.id, req.body) })
}

export async function list(_req: Request, res: Response) {
  res.json({ deliveries: await deliveryService.listDeliveries() })
}

export async function dispatch(req: Request, res: Response) {
  const provider = typeof req.body?.provider === 'string' && req.body.provider ? req.body.provider : 'Pathao'
  res.json({ delivery: await deliveryService.dispatchToProvider(req.params.id, provider) })
}

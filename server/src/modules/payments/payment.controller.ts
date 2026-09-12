import type { Request, Response } from 'express'
import * as paymentService from './payment.service.js'
import { getOrder } from '../orders/admin-order.service.js'

export async function list(req: Request, res: Response) {
  res.json({ payments: await paymentService.listPayments(req.params.id) })
}

export async function record(req: Request, res: Response) {
  const payment = await paymentService.recordPayment(req.params.id, req.body)
  // Return the refreshed order so the UI gets the recomputed status + due.
  const order = await getOrder(req.params.id)
  res.status(201).json({ payment, order })
}

export async function remove(req: Request, res: Response) {
  await paymentService.deletePayment(req.params.id)
  res.status(204).send()
}

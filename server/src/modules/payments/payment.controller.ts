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

/// Mock online-gateway charge (integration point for bKash / a card gateway).
/// A real integration would redirect the customer and confirm via webhook; here
/// we simulate a successful charge and record it with a gateway reference.
export async function gatewayCharge(req: Request, res: Response) {
  const method = req.body?.method === 'CARD' ? 'CARD' : 'BKASH'
  const amount = Number(req.body?.amount)
  const reference = `GW-${method}-${Math.floor(100000 + Math.random() * 900000)}`
  const payment = await paymentService.recordPayment(req.params.id, {
    method,
    amount,
    status: 'SUCCESS',
    reference,
  })
  const order = await getOrder(req.params.id)
  res.status(201).json({ payment, order })
}

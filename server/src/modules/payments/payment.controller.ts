import type { Request, Response } from 'express'
import * as paymentService from './payment.service.js'
import { getOrder } from '../orders/admin-order.service.js'
import { getMyOrder } from '../orders/order.service.js'
import { requireCustomerId } from '../orders/customer.js'
import { bkashMode } from './bkash.js'

// ---- Admin ----

export async function list(req: Request, res: Response) {
  res.json({ payments: await paymentService.listPayments(req.params.id) })
}

export async function record(req: Request, res: Response) {
  const payment = await paymentService.recordPayment(req.params.id, req.body)
  const order = await getOrder(req.params.id)
  res.status(201).json({ payment, order })
}

export async function remove(req: Request, res: Response) {
  await paymentService.deletePayment(req.params.id)
  res.status(204).send()
}

/// Verify or reject a customer's pending manual payment claim.
export async function verify(req: Request, res: Response) {
  const payment = await paymentService.verifyPayment(req.params.id, req.body.action)
  const order = await getOrder(payment.orderId)
  res.json({ payment, order })
}

// ---- Customer ----

/// Submit a manual payment claim (cash / transfer) — awaits admin verification.
export async function claim(req: Request, res: Response) {
  const customerId = await requireCustomerId(req.user!.id)
  const payment = await paymentService.submitClaim(req.params.id, customerId, req.body)
  const order = await getMyOrder(customerId, req.params.id)
  res.status(201).json({ payment, order })
}

/// Start a bKash payment; returns the URL to send the customer to.
export async function bkashCreate(req: Request, res: Response) {
  const customerId = await requireCustomerId(req.user!.id)
  const start = await paymentService.startBkashPayment(
    req.params.id,
    customerId,
    req.body.callbackURL,
    req.body.amount,
  )
  res.status(201).json({ ...start, mode: bkashMode })
}

/// Complete a bKash payment after the customer returns from the gateway.
export async function bkashExecute(req: Request, res: Response) {
  const customerId = await requireCustomerId(req.user!.id)
  const result = await paymentService.executeBkashPayment(req.params.id, customerId, req.body.paymentID)
  const order = await getMyOrder(customerId, req.params.id)
  res.json({ ...result, order })
}

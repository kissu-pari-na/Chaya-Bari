import type { Request, Response } from 'express'
import * as paymentService from './payment.service.js'
import * as paymentSettingService from './payment-setting.service.js'
import { getOrder } from '../orders/admin-order.service.js'
import { getMyOrder } from '../orders/order.service.js'
import { requireCustomerId } from '../orders/customer.js'
import { bkashMode } from './bkash.js'

// ---- Admin ----

export async function list(req: Request, res: Response) {
  res.json({ payments: await paymentService.listPayments(req.params.id) })
}

export async function record(req: Request, res: Response) {
  const payment = await paymentService.recordPayment(req.params.id, req.body, req.user!.id)
  const order = await getOrder(req.params.id)
  res.status(201).json({ payment, order })
}

/// Void a payment recorded in error (kept for audit, no longer counts).
export async function voidPayment(req: Request, res: Response) {
  const payment = await paymentService.voidPayment(req.params.id, req.user!.id, req.body.reason)
  const order = await getOrder(payment.orderId)
  res.json({ payment, order })
}

/// Refund a successful payment (offsetting REFUNDED row, kept for audit).
export async function refund(req: Request, res: Response) {
  const payment = await paymentService.refundPayment(
    req.params.id,
    req.user!.id,
    req.body.amount,
    req.body.reason,
  )
  const order = await getOrder(payment.orderId)
  res.json({ payment, order })
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

// ---- Payment-account settings ----

/// Public: the account numbers customers send manual payments to.
export async function getPaymentInfo(_req: Request, res: Response) {
  res.json({ paymentInfo: await paymentSettingService.getPaymentSetting() })
}

/// Admin: update the payment-account settings.
export async function updatePaymentInfo(req: Request, res: Response) {
  res.json({ paymentInfo: await paymentSettingService.updatePaymentSetting(req.body) })
}

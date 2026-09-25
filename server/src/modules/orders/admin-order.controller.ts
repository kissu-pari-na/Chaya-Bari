import type { Request, Response } from 'express'
import type { OrderStatus } from '@prisma/client'
import { parsePageParams } from '../../lib/pagination.js'
import { HttpError } from '../../utils/httpError.js'
import * as adminOrderService from './admin-order.service.js'
import { lookupCustomerByEmail } from '../customers/customer-account.service.js'

function str(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined
}

export async function list(req: Request, res: Response) {
  const page = parsePageParams(req, { maxLimit: 100 })
  const { items, total } = await adminOrderService.listOrders({
    status: str(req.query.status) as OrderStatus | undefined,
    paymentStatus: str(req.query.paymentStatus),
    search: str(req.query.search),
    fromDate: str(req.query.fromDate),
    toDate: str(req.query.toDate),
    limit: page?.limit,
    offset: page?.offset,
  })
  res.json({ orders: items, total })
}

export async function create(req: Request, res: Response) {
  const order = await adminOrderService.createOrderOnBehalf(req.body, req.user!.id)
  res.status(201).json({ order })
}

/// Who an email belongs to (if anyone) plus their saved addresses, for the
/// admin's "order on behalf" form.
export async function lookupCustomer(req: Request, res: Response) {
  const email = str(req.query.email)
  if (!email || !email.includes('@')) throw HttpError.badRequest('A valid email is required')
  res.json({ customer: await lookupCustomerByEmail(email) })
}

export async function get(req: Request, res: Response) {
  res.json({ order: await adminOrderService.getOrder(req.params.id) })
}

export async function updateStatus(req: Request, res: Response) {
  res.json({ order: await adminOrderService.updateStatus(req.params.id, req.body.status) })
}

export async function updatePaymentStatus(req: Request, res: Response) {
  res.json({ order: await adminOrderService.updatePaymentStatus(req.params.id, req.body.paymentStatus) })
}

export async function updatePaymentMode(req: Request, res: Response) {
  res.json({ order: await adminOrderService.updatePaymentMode(req.params.id, req.body.paymentMode) })
}

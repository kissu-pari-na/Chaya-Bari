import type { Request, Response } from 'express'
import type { OrderStatus } from '@prisma/client'
import { parsePageParams } from '../../lib/pagination.js'
import * as adminOrderService from './admin-order.service.js'

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

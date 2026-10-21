import type { Request, Response } from 'express'
import { prisma } from '../../lib/prisma.js'
import { HttpError } from '../../utils/httpError.js'
import { requireCustomerId } from '../orders/customer.js'
import { getOrder } from '../orders/admin-order.service.js'
import * as wallet from './wallet.service.js'

// ---- Customer ----

export async function mine(req: Request, res: Response) {
  const customerId = await requireCustomerId(req.user!.id)
  const [summary, timeline] = await Promise.all([wallet.walletSummary(customerId), wallet.walletTimeline(customerId)])
  res.json({ wallet: summary, timeline })
}

export async function claim(req: Request, res: Response) {
  const customerId = await requireCustomerId(req.user!.id)
  res.status(201).json({ entry: await wallet.submitClaim(customerId, req.body) })
}

export async function redeem(req: Request, res: Response) {
  const customerId = await requireCustomerId(req.user!.id)
  const grant = await wallet.redeemLimitCode(customerId, req.body.code)
  res.status(201).json({ grant, wallet: await wallet.walletSummary(customerId) })
}

// ---- Admin ----

export async function list(req: Request, res: Response) {
  const search = typeof req.query.search === 'string' ? req.query.search : undefined
  res.json({ wallets: await wallet.listWallets(search), totals: await wallet.walletTotals() })
}

export async function claims(_req: Request, res: Response) {
  res.json({ claims: await wallet.pendingClaims() })
}

export async function detail(req: Request, res: Response) {
  const customer = await prisma.customer.findUnique({ where: { id: req.params.customerId }, include: { user: true } })
  if (!customer) throw HttpError.notFound('Customer not found')
  const [summary, timeline] = await Promise.all([
    wallet.walletSummary(customer.id),
    wallet.walletTimeline(customer.id),
  ])
  res.json({
    customer: { id: customer.id, name: customer.user.name, email: customer.user.email, phone: customer.user.phone },
    wallet: summary,
    timeline,
  })
}

export async function adjust(req: Request, res: Response) {
  const admin = await wallet.actorOf(req.user!.id)
  const entry = await wallet.adjust(req.params.customerId, req.body, admin)
  res.status(201).json({ entry, wallet: await wallet.walletSummary(req.params.customerId) })
}

export async function review(req: Request, res: Response) {
  const admin = await wallet.actorOf(req.user!.id)
  res.json({ entry: await wallet.reviewClaim(req.params.id, req.body.action, admin, req.body.note) })
}

export async function recordOrderPayment(req: Request, res: Response) {
  const admin = await wallet.actorOf(req.user!.id)
  await wallet.recordOrderPayment(req.params.id, req.body, admin)
  res.status(201).json({ order: await getOrder(req.params.id) })
}

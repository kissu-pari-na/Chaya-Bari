import type { Request, Response } from 'express'
import { HttpError } from '../../utils/httpError.js'
import * as analyticsService from './analytics.service.js'

function requireRange(req: Request): { from: string; to: string } {
  const from = req.query.from
  const to = req.query.to
  if (typeof from !== 'string' || typeof to !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) {
    throw HttpError.badRequest('from and to (YYYY-MM-DD) query params are required')
  }
  return { from, to }
}

export async function summary(req: Request, res: Response) {
  const { from, to } = requireRange(req)
  res.json({ summary: await analyticsService.businessSummary(from, to) })
}

export async function products(req: Request, res: Response) {
  const { from, to } = requireRange(req)
  res.json({ products: await analyticsService.productProfitability(from, to) })
}

export async function contribution(req: Request, res: Response) {
  res.json({ contribution: await analyticsService.orderContribution(req.params.id) })
}

export async function customers(req: Request, res: Response) {
  const { from, to } = requireRange(req)
  res.json({ customers: await analyticsService.customerAnalytics(from, to) })
}

export async function demandProfit(req: Request, res: Response) {
  const { from, to } = requireRange(req)
  res.json({ products: await analyticsService.demandProfitAnalysis(from, to) })
}

export async function salesByDay(req: Request, res: Response) {
  const { from, to } = requireRange(req)
  res.json({ days: await analyticsService.salesByDay(from, to) })
}

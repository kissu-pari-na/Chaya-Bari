import type { Request, Response } from 'express'
import { requireCustomerId } from '../orders/customer.js'
import * as reviewService from './review.service.js'

// ---- Public reads ----

export async function listForProduct(req: Request, res: Response) {
  const productId = req.params.id
  const [reviews, summary] = await Promise.all([
    reviewService.listProductReviews(productId),
    reviewService.getProductRatingSummary(productId),
  ])
  res.json({ reviews, summary })
}

export async function listTop(_req: Request, res: Response) {
  res.json({ reviews: await reviewService.listTopReviews() })
}

export async function siteSummary(_req: Request, res: Response) {
  res.json({ summary: await reviewService.getSiteRatingSummary() })
}

// ---- Order-based review page (authenticated customer, own order) ----

export async function getOrderReview(req: Request, res: Response) {
  const customerId = await requireCustomerId(req.user!.id)
  res.json(await reviewService.getOrderReview(customerId, req.params.orderId))
}

export async function submitOrderReviews(req: Request, res: Response) {
  const customerId = await requireCustomerId(req.user!.id)
  const data = await reviewService.submitOrderReviews(customerId, req.params.orderId, req.body)
  res.status(201).json(data)
}

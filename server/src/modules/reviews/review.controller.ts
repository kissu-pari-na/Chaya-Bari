import type { Request, Response } from 'express'
import { requireCustomerId } from '../orders/customer.js'
import * as reviewService from './review.service.js'

// ---- Public ----

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

// ---- Customer (authenticated) ----

export async function getMine(req: Request, res: Response) {
  const customerId = await requireCustomerId(req.user!.id)
  res.json(await reviewService.getMyReview(customerId, req.params.id))
}

export async function submit(req: Request, res: Response) {
  const customerId = await requireCustomerId(req.user!.id)
  const review = await reviewService.upsertReview(customerId, req.params.id, req.body)
  res.status(201).json({ review })
}

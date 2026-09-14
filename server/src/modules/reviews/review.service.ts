import { prisma } from '../../lib/prisma.js'
import { HttpError } from '../../utils/httpError.js'
import type { SubmitOrderReviewsInput } from './review.schemas.js'

export interface PublicReview {
  id: string
  productId: string | null
  productName: string | null
  rating: number
  comment: string | null
  customerName: string
  createdAt: string
}

export interface RatingSummary {
  average: number
  count: number
}

interface ReviewRow {
  id: string
  productId: string | null
  rating: number
  comment: string | null
  createdAt: Date
  customer: { user: { name: string } }
  product?: { name: string } | null
}

function toPublicReview(r: ReviewRow): PublicReview {
  return {
    id: r.id,
    productId: r.productId,
    productName: r.product?.name ?? null,
    rating: r.rating,
    comment: r.comment,
    customerName: r.customer.user.name,
    createdAt: r.createdAt.toISOString(),
  }
}

// ---- Rating aggregates (product-scoped; overall/order reviews are excluded) ----

/// Average rating (rounded to 1 decimal) and review count for one product.
export async function getProductRatingSummary(productId: string): Promise<RatingSummary> {
  const agg = await prisma.review.aggregate({
    where: { productId },
    _avg: { rating: true },
    _count: true,
  })
  return { average: round1(agg._avg.rating ?? 0), count: agg._count }
}

/// Rating summaries for many products at once, keyed by product id.
export async function getRatingSummariesByProduct(
  productIds: string[],
): Promise<Map<string, RatingSummary>> {
  if (productIds.length === 0) return new Map()
  const rows = await prisma.review.groupBy({
    by: ['productId'],
    where: { productId: { in: productIds } },
    _avg: { rating: true },
    _count: { _all: true },
  })
  const map = new Map<string, RatingSummary>()
  for (const row of rows) {
    if (row.productId) {
      map.set(row.productId, { average: round1(row._avg.rating ?? 0), count: row._count._all })
    }
  }
  return map
}

/// Site-wide product rating (average across all product reviews) + total count.
export async function getSiteRatingSummary(): Promise<RatingSummary> {
  const agg = await prisma.review.aggregate({
    where: { productId: { not: null } },
    _avg: { rating: true },
    _count: true,
  })
  return { average: round1(agg._avg.rating ?? 0), count: agg._count }
}

// ---- Public product review listing ----

export async function listProductReviews(productId: string): Promise<PublicReview[]> {
  const reviews = await prisma.review.findMany({
    where: { productId },
    orderBy: [{ createdAt: 'desc' }],
    include: { customer: { include: { user: { select: { name: true } } } } },
  })
  return reviews.map(toPublicReview)
}

/// Top product reviews for the home page: written feedback, highest rated
/// first, then most recent. Overall (order) reviews are excluded.
export async function listTopReviews(limit = 4): Promise<PublicReview[]> {
  const reviews = await prisma.review.findMany({
    where: { productId: { not: null }, comment: { not: null }, rating: { gte: 4 } },
    orderBy: [{ rating: 'desc' }, { createdAt: 'desc' }],
    take: limit,
    include: {
      customer: { include: { user: { select: { name: true } } } },
      product: { select: { name: true } },
    },
  })
  return reviews.map(toPublicReview)
}

// ---- Order-based review page ----

export interface OrderReviewProduct {
  productId: string
  productName: string
  quantity: number
  rating: number | null
  comment: string | null
}

export interface OrderReviewData {
  orderId: string
  orderNumber: string
  status: string
  /// Reviews may only be submitted once the order is delivered.
  canReview: boolean
  products: OrderReviewProduct[]
  overall: { rating: number; comment: string | null } | null
}

async function getOwnedOrder(customerId: string, orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true, reviews: true },
  })
  if (!order || order.customerId !== customerId) throw HttpError.notFound('Order not found')
  return order
}

export async function getOrderReview(customerId: string, orderId: string): Promise<OrderReviewData> {
  const order = await getOwnedOrder(customerId, orderId)
  const reviewByProduct = new Map<string, { rating: number; comment: string | null }>()
  let overall: { rating: number; comment: string | null } | null = null
  for (const r of order.reviews) {
    if (r.productId) reviewByProduct.set(r.productId, { rating: r.rating, comment: r.comment })
    else overall = { rating: r.rating, comment: r.comment }
  }

  // One reviewable entry per distinct product (skip lines whose product was
  // deleted). Quantities are summed in case a product appears on two lines.
  const byProduct = new Map<string, OrderReviewProduct>()
  for (const item of order.items) {
    if (!item.productId) continue
    const existing = byProduct.get(item.productId)
    if (existing) {
      existing.quantity += item.quantity
    } else {
      const r = reviewByProduct.get(item.productId)
      byProduct.set(item.productId, {
        productId: item.productId,
        productName: item.productName,
        quantity: item.quantity,
        rating: r?.rating ?? null,
        comment: r?.comment ?? null,
      })
    }
  }

  return {
    orderId: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    canReview: order.status === 'DELIVERED',
    products: [...byProduct.values()],
    overall,
  }
}

/// Upsert the order's product reviews (and optional overall review). Requires
/// the order to belong to the customer and to be delivered; each productId must
/// be one the order actually contains.
export async function submitOrderReviews(
  customerId: string,
  orderId: string,
  input: SubmitOrderReviewsInput,
): Promise<OrderReviewData> {
  const order = await getOwnedOrder(customerId, orderId)
  if (order.status !== 'DELIVERED') {
    throw HttpError.badRequest('You can review an order only after it is delivered')
  }

  const orderProductIds = new Set(order.items.map((i) => i.productId).filter(Boolean) as string[])
  for (const item of input.items ?? []) {
    if (!orderProductIds.has(item.productId)) {
      throw HttpError.badRequest('You can only review products from this order')
    }
  }

  // Reviews are immutable once submitted: reject any target already reviewed.
  const reviewedKeys = new Set(order.reviews.map((r) => r.productId ?? OVERALL_KEY))
  const targets: { productId: string | null; rating: number; comment: string | null }[] = []
  for (const item of input.items ?? []) {
    if (reviewedKeys.has(item.productId)) {
      throw HttpError.badRequest('This product has already been reviewed for this order')
    }
    targets.push({ productId: item.productId, rating: item.rating, comment: item.comment ?? null })
  }
  if (input.overall) {
    if (reviewedKeys.has(OVERALL_KEY)) {
      throw HttpError.badRequest('This order has already been reviewed overall')
    }
    targets.push({ productId: null, rating: input.overall.rating, comment: input.overall.comment ?? null })
  }

  // Create each target once — never update (reviews are final).
  await prisma.$transaction(async (tx) => {
    for (const t of targets) {
      await tx.review.create({
        data: { orderId, customerId, productId: t.productId, rating: t.rating, comment: t.comment },
      })
    }
  })

  return getOrderReview(customerId, orderId)
}

function round1(n: number): number {
  return Math.round(n * 10) / 10
}

// Sentinel key for the order's overall (null-product) review.
const OVERALL_KEY = '__overall__'

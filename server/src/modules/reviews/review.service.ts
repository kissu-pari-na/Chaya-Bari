import { prisma } from '../../lib/prisma.js'
import { HttpError } from '../../utils/httpError.js'
import type { CreateReviewInput } from './review.schemas.js'

export interface PublicReview {
  id: string
  productId: string
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
  productId: string
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

// ---- Rating aggregates (used by the products module too) ----

/// Average rating (rounded to 1 decimal) and review count for one product.
export async function getProductRatingSummary(productId: string): Promise<RatingSummary> {
  const agg = await prisma.review.aggregate({
    where: { productId },
    _avg: { rating: true },
    _count: true,
  })
  return { average: round1(agg._avg.rating ?? 0), count: agg._count }
}

/// Rating summaries for many products at once, keyed by product id. Products
/// with no reviews are absent from the map (caller defaults to 0/0).
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
    map.set(row.productId, { average: round1(row._avg.rating ?? 0), count: row._count._all })
  }
  return map
}

/// Site-wide rating (average across all reviews) and total review count.
/// Powers the home-page hero rating badge.
export async function getSiteRatingSummary(): Promise<RatingSummary> {
  const agg = await prisma.review.aggregate({ _avg: { rating: true }, _count: true })
  return { average: round1(agg._avg.rating ?? 0), count: agg._count }
}

// ---- Product review listing ----

export async function listProductReviews(productId: string): Promise<PublicReview[]> {
  const reviews = await prisma.review.findMany({
    where: { productId },
    orderBy: [{ createdAt: 'desc' }],
    include: { customer: { include: { user: { select: { name: true } } } } },
  })
  return reviews.map(toPublicReview)
}

/// Top reviews for the home page: only ones with written feedback, highest
/// rated first, then most recent.
export async function listTopReviews(limit = 6): Promise<PublicReview[]> {
  const reviews = await prisma.review.findMany({
    where: { comment: { not: null }, rating: { gte: 4 } },
    orderBy: [{ rating: 'desc' }, { createdAt: 'desc' }],
    take: limit,
    include: {
      customer: { include: { user: { select: { name: true } } } },
      product: { select: { name: true } },
    },
  })
  return reviews.map(toPublicReview)
}

// ---- Customer's own review + eligibility ----

/// True when the customer has at least one order line for this product, i.e.
/// they actually bought it and may review it.
export async function hasOrderedProduct(customerId: string, productId: string): Promise<boolean> {
  const line = await prisma.orderItem.findFirst({
    where: { productId, order: { customerId } },
    select: { id: true },
  })
  return line !== null
}

export interface MyReviewResult {
  review: PublicReview | null
  canReview: boolean
}

export async function getMyReview(customerId: string, productId: string): Promise<MyReviewResult> {
  const [review, canReview] = await Promise.all([
    prisma.review.findUnique({
      where: { productId_customerId: { productId, customerId } },
      include: { customer: { include: { user: { select: { name: true } } } } },
    }),
    hasOrderedProduct(customerId, productId),
  ])
  return { review: review ? toPublicReview(review) : null, canReview }
}

/// Create or update the customer's review for a product. Requires that the
/// product exists and that the customer has ordered it.
export async function upsertReview(
  customerId: string,
  productId: string,
  input: CreateReviewInput,
): Promise<PublicReview> {
  const product = await prisma.product.findUnique({ where: { id: productId }, select: { id: true } })
  if (!product) throw HttpError.notFound('Product not found')

  if (!(await hasOrderedProduct(customerId, productId))) {
    throw HttpError.forbidden('You can only review products you have ordered')
  }

  const review = await prisma.review.upsert({
    where: { productId_customerId: { productId, customerId } },
    create: { productId, customerId, rating: input.rating, comment: input.comment ?? null },
    update: { rating: input.rating, comment: input.comment ?? null },
    include: { customer: { include: { user: { select: { name: true } } } } },
  })
  return toPublicReview(review)
}

function round1(n: number): number {
  return Math.round(n * 10) / 10
}

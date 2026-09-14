import { apiRequest } from './apiClient'
import type { OrderReviewData, OrderReviewSubmit, RatingSummary, Review } from '../types/review'

/// Reviews + rating summary for one product (public, read-only).
export function fetchProductReviews(productId: string) {
  return apiRequest<{ reviews: Review[]; summary: RatingSummary }>(
    `/products/${productId}/reviews`,
  )
}

/// Top product reviews for the home page (public).
export function fetchTopReviews() {
  return apiRequest<{ reviews: Review[] }>('/reviews/top').then((r) => r.reviews)
}

/// Site-wide product rating summary for the home hero badge (public).
export function fetchRatingSummary() {
  return apiRequest<{ summary: RatingSummary }>('/reviews/summary').then((r) => r.summary)
}

// ---- Order-based review page ----

/// The reviewable products for one of the customer's orders + any existing
/// reviews and whether reviewing is allowed yet (order delivered).
export function fetchOrderReview(orderId: string) {
  return apiRequest<OrderReviewData>(`/orders/${orderId}/review`, { auth: true })
}

/// Submit (create/update) the order's product reviews and/or overall review.
export function submitOrderReviews(orderId: string, body: OrderReviewSubmit) {
  return apiRequest<OrderReviewData>(`/orders/${orderId}/reviews`, {
    method: 'POST',
    body,
    auth: true,
  })
}

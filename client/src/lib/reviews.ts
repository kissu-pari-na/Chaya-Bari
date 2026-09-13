import { apiRequest } from './apiClient'
import type { MyReview, RatingSummary, Review, ReviewInput } from '../types/review'

/// Reviews + rating summary for one product (public).
export function fetchProductReviews(productId: string) {
  return apiRequest<{ reviews: Review[]; summary: RatingSummary }>(
    `/products/${productId}/reviews`,
  )
}

/// Top reviews for the home page (public).
export function fetchTopReviews() {
  return apiRequest<{ reviews: Review[] }>('/reviews/top').then((r) => r.reviews)
}

/// Site-wide rating summary for the home hero badge (public).
export function fetchRatingSummary() {
  return apiRequest<{ summary: RatingSummary }>('/reviews/summary').then((r) => r.summary)
}

/// The signed-in customer's own review for a product + whether they may review.
export function fetchMyReview(productId: string) {
  return apiRequest<MyReview>(`/products/${productId}/reviews/me`, { auth: true })
}

/// Create or update the customer's review for a product.
export function submitReview(productId: string, input: ReviewInput) {
  return apiRequest<{ review: Review }>(`/products/${productId}/reviews`, {
    method: 'POST',
    body: input,
    auth: true,
  }).then((r) => r.review)
}

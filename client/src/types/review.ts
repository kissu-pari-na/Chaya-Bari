export interface Review {
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

export interface MyReview {
  review: Review | null
  canReview: boolean
}

export interface ReviewInput {
  rating: number
  comment?: string
}

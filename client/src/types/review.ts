export interface Review {
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
  canReview: boolean
  products: OrderReviewProduct[]
  overall: { rating: number; comment: string | null } | null
}

export interface OrderReviewSubmit {
  items?: { productId: string; rating: number; comment?: string }[]
  overall?: { rating: number; comment?: string }
}

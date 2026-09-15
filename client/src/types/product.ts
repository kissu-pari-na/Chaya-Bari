export interface Category {
  id: string
  name: string
  sortOrder: number
  isActive: boolean
}

export interface Product {
  id: string
  name: string
  /** Optional English name; shown when the app language is English, else falls back to `name`. */
  nameEnglish: string | null
  description: string | null
  imageUrl: string | null
  price: number
  salePrice: number | null
  isActive: boolean
  isAvailable: boolean
  prepInfo: string | null
  categoryId: string | null
  categoryName: string | null
  /// Average star rating (0 when no reviews) and how many reviews it has.
  avgRating: number
  reviewCount: number
}

export interface ProductInput {
  name: string
  nameEnglish?: string
  description?: string
  imageUrl?: string
  price: number
  salePrice?: number | null
  categoryId?: string
  prepInfo?: string
  isActive?: boolean
  isAvailable?: boolean
}

/// Charged price for a product, honoring a valid sale price.
export function effectivePrice(p: Pick<Product, 'price' | 'salePrice'>): number {
  return p.salePrice != null && p.salePrice < p.price ? p.salePrice : p.price
}

export interface CategoryInput {
  name: string
  sortOrder?: number
  isActive?: boolean
}

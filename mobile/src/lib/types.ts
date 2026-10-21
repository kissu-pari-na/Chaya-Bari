// API shapes the app reads. Mirrors client/src/types (keep in step with them).

export type Role = 'CUSTOMER' | 'ADMIN' | 'KITCHEN'

export interface AuthUser {
  id: string
  name: string
  email: string
  phone: string | null
  role: Role
  emailVerified: boolean
  createdAt: string
}

export interface AuthResponse {
  user: AuthUser
  token: string
}

export interface Category {
  id: string
  name: string
  sortOrder: number
  isActive: boolean
}

export interface Product {
  id: string
  name: string
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
  avgRating: number
  reviewCount: number
}

/** Charged price, honouring a valid sale price. A preview only: the server prices orders (R-PLT-004). */
export function effectivePrice(p: Pick<Product, 'price' | 'salePrice'>): number {
  return p.salePrice != null && p.salePrice < p.price ? p.salePrice : p.price
}

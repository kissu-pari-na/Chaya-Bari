export interface Category {
  id: string
  name: string
  sortOrder: number
  isActive: boolean
}

export interface Product {
  id: string
  name: string
  description: string | null
  imageUrl: string | null
  price: number
  isActive: boolean
  isAvailable: boolean
  prepInfo: string | null
  categoryId: string | null
  categoryName: string | null
}

export interface ProductInput {
  name: string
  description?: string
  imageUrl?: string
  price: number
  categoryId?: string
  prepInfo?: string
  isActive?: boolean
  isAvailable?: boolean
}

export interface CategoryInput {
  name: string
  sortOrder?: number
  isActive?: boolean
}

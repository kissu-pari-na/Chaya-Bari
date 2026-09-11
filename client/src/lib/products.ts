import { apiRequest } from './apiClient'
import type { Category, CategoryInput, Product, ProductInput } from '../types/product'

// ---- Public (customer) ----

export function fetchProducts(categoryId?: string) {
  const query = categoryId ? `?categoryId=${encodeURIComponent(categoryId)}` : ''
  return apiRequest<{ products: Product[] }>(`/products${query}`).then((r) => r.products)
}

export function fetchProduct(id: string) {
  return apiRequest<{ product: Product }>(`/products/${id}`).then((r) => r.product)
}

export function fetchCategories() {
  return apiRequest<{ categories: Category[] }>('/categories').then((r) => r.categories)
}

// ---- Admin ----

export function fetchAdminProducts() {
  return apiRequest<{ products: Product[] }>('/admin/products', { auth: true }).then((r) => r.products)
}

export function createProduct(input: ProductInput) {
  return apiRequest<{ product: Product }>('/admin/products', { method: 'POST', body: input, auth: true }).then(
    (r) => r.product,
  )
}

export function updateProduct(id: string, input: Partial<ProductInput>) {
  return apiRequest<{ product: Product }>(`/admin/products/${id}`, {
    method: 'PATCH',
    body: input,
    auth: true,
  }).then((r) => r.product)
}

export function deleteProduct(id: string) {
  return apiRequest<void>(`/admin/products/${id}`, { method: 'DELETE', auth: true })
}

export function fetchAdminCategories() {
  return apiRequest<{ categories: Category[] }>('/admin/categories', { auth: true }).then((r) => r.categories)
}

export function createCategory(input: CategoryInput) {
  return apiRequest<{ category: Category }>('/admin/categories', {
    method: 'POST',
    body: input,
    auth: true,
  }).then((r) => r.category)
}

export function updateCategory(id: string, input: Partial<CategoryInput>) {
  return apiRequest<{ category: Category }>(`/admin/categories/${id}`, {
    method: 'PATCH',
    body: input,
    auth: true,
  }).then((r) => r.category)
}

export function deleteCategory(id: string) {
  return apiRequest<void>(`/admin/categories/${id}`, { method: 'DELETE', auth: true })
}

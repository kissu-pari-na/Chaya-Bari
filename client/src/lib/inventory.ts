import { apiRequest } from './apiClient'
import type {
  CostingRow,
  Material,
  MaterialInput,
  Purchase,
  PurchaseInput,
  Recipe,
  RecipeInput,
} from '../types/inventory'

// ---- Materials ----

export function fetchMaterials(kind?: string) {
  const q = kind ? `?kind=${kind}` : ''
  return apiRequest<{ materials: Material[] }>(`/admin/materials${q}`, { auth: true }).then((r) => r.materials)
}

export function createMaterial(input: MaterialInput) {
  return apiRequest<{ material: Material }>('/admin/materials', { method: 'POST', body: input, auth: true }).then(
    (r) => r.material,
  )
}

export function deleteMaterial(id: string) {
  return apiRequest<void>(`/admin/materials/${id}`, { method: 'DELETE', auth: true })
}

export function adjustStock(id: string, quantityDelta: number, note?: string) {
  return apiRequest<{ material: Material }>(`/admin/materials/${id}/adjust`, {
    method: 'POST',
    body: { quantityDelta, note },
    auth: true,
  }).then((r) => r.material)
}

// ---- Purchases ----

export function fetchPurchases() {
  return apiRequest<{ purchases: Purchase[] }>('/admin/purchases', { auth: true }).then((r) => r.purchases)
}

export function createPurchase(input: PurchaseInput) {
  return apiRequest<{ purchase: Purchase }>('/admin/purchases', { method: 'POST', body: input, auth: true }).then(
    (r) => r.purchase,
  )
}

// ---- Recipes / costing ----

export function fetchRecipe(productId: string) {
  return apiRequest<{ recipe: Recipe | null }>(`/admin/products/${productId}/recipe`, { auth: true }).then(
    (r) => r.recipe,
  )
}

export function saveRecipe(productId: string, input: RecipeInput) {
  return apiRequest<{ recipe: Recipe }>(`/admin/products/${productId}/recipe`, {
    method: 'PUT',
    body: input,
    auth: true,
  }).then((r) => r.recipe)
}

export function deleteRecipe(productId: string) {
  return apiRequest<void>(`/admin/products/${productId}/recipe`, { method: 'DELETE', auth: true })
}

export function fetchCosting() {
  return apiRequest<{ costing: CostingRow[] }>('/admin/costing', { auth: true }).then((r) => r.costing)
}

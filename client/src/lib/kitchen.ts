import { apiRequest } from './apiClient'
import type { KitchenStatus, ProductionDate, ProductionDay, ProductionItem } from '../types/kitchen'

export function fetchProductionDates() {
  return apiRequest<{ dates: ProductionDate[] }>('/kitchen/dates', { auth: true }).then((r) => r.dates)
}

export function fetchProduction(date: string) {
  return apiRequest<{ production: ProductionDay }>(`/kitchen/production?date=${date}`, { auth: true }).then(
    (r) => r.production,
  )
}

export function updateKitchenStatus(date: string, productId: string, status: KitchenStatus) {
  return apiRequest<{ item: ProductionItem }>('/kitchen/production/status', {
    method: 'PATCH',
    body: { date, productId, status },
    auth: true,
  }).then((r) => r.item)
}

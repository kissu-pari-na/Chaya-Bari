import { apiRequest } from './apiClient'
import type { KitchenOrder, KitchenStage, ProductionDate, ProductionDay } from '../types/kitchen'

export function fetchProductionDates() {
  return apiRequest<{ dates: ProductionDate[] }>('/kitchen/dates', { auth: true }).then((r) => r.dates)
}

export function fetchProduction(date: string) {
  return apiRequest<{ production: ProductionDay }>(`/kitchen/production?date=${date}`, { auth: true }).then(
    (r) => r.production,
  )
}

/// Move one order to a kitchen stage (CONFIRMED / PREPARING / PACKED).
export function setOrderStage(orderId: string, status: KitchenStage) {
  return apiRequest<{ order: KitchenOrder }>(`/kitchen/orders/${orderId}/stage`, {
    method: 'PATCH',
    body: { status },
    auth: true,
  }).then((r) => r.order)
}

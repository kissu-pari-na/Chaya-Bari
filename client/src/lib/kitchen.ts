import { apiRequest } from './apiClient'
import type { KitchenStage, ProductionDate, ProductionDay } from '../types/kitchen'

export function fetchProductionDates() {
  return apiRequest<{ dates: ProductionDate[] }>('/kitchen/dates', { auth: true }).then((r) => r.dates)
}

export function fetchProduction(date: string) {
  return apiRequest<{ production: ProductionDay }>(`/kitchen/production?date=${date}`, { auth: true }).then(
    (r) => r.production,
  )
}

/// Move one order line (a product within one order) to an adjacent stage.
export function moveLine(lineId: string, stage: KitchenStage) {
  return apiRequest<{ production: ProductionDay }>(`/kitchen/lines/${lineId}/stage`, {
    method: 'PATCH',
    body: { stage },
    auth: true,
  }).then((r) => r.production)
}

/// Move all lines of a product (on a day) from one stage to an adjacent one.
export function moveProduct(date: string, productId: string | null, from: KitchenStage, to: KitchenStage) {
  return apiRequest<{ production: ProductionDay }>('/kitchen/products/move', {
    method: 'POST',
    body: { date, productId, from, to },
    auth: true,
  }).then((r) => r.production)
}

/// Pack (or un-pack) a ready order — an order-level step after cooking.
export function packOrder(orderId: string, packed: boolean) {
  return apiRequest<{ production: ProductionDay }>(`/kitchen/orders/${orderId}/pack`, {
    method: 'PATCH',
    body: { packed },
    auth: true,
  }).then((r) => r.production)
}

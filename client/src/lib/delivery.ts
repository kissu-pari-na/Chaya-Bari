import { apiRequest } from './apiClient'
import type { Delivery, DeliveryListRow, DeliveryUpdate } from '../types/delivery'

export function fetchOrderDelivery(orderId: string) {
  return apiRequest<{ delivery: Delivery | null }>(`/admin/orders/${orderId}/delivery`, { auth: true }).then(
    (r) => r.delivery,
  )
}

export function createOrderDelivery(orderId: string) {
  return apiRequest<{ delivery: Delivery }>(`/admin/orders/${orderId}/delivery`, {
    method: 'POST',
    auth: true,
  }).then((r) => r.delivery)
}

export function updateDelivery(id: string, input: DeliveryUpdate) {
  return apiRequest<{ delivery: Delivery }>(`/admin/deliveries/${id}`, {
    method: 'PATCH',
    body: input,
    auth: true,
  }).then((r) => r.delivery)
}

export function fetchDeliveries() {
  return apiRequest<{ deliveries: DeliveryListRow[] }>('/admin/deliveries', { auth: true }).then((r) => r.deliveries)
}

/// Mock third-party dispatch (integration point for Pathao/pandago).
export function dispatchDelivery(id: string, provider: string) {
  return apiRequest<{ delivery: Delivery }>(`/admin/deliveries/${id}/dispatch`, {
    method: 'POST',
    body: { provider },
    auth: true,
  }).then((r) => r.delivery)
}

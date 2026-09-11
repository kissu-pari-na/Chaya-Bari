import { apiRequest } from './apiClient'
import type { Address, AddressInput, CheckoutInput, Order, OrderingWindow } from '../types/order'

export function fetchOrderingWindow() {
  return apiRequest<{ window: OrderingWindow }>('/ordering/window', { auth: true }).then((r) => r.window)
}

export function fetchAddresses() {
  return apiRequest<{ addresses: Address[] }>('/addresses', { auth: true }).then((r) => r.addresses)
}

export function createAddress(input: AddressInput) {
  return apiRequest<{ address: Address }>('/addresses', { method: 'POST', body: input, auth: true }).then(
    (r) => r.address,
  )
}

export function deleteAddress(id: string) {
  return apiRequest<void>(`/addresses/${id}`, { method: 'DELETE', auth: true })
}

export function placeOrder(input: CheckoutInput) {
  return apiRequest<{ order: Order }>('/orders', { method: 'POST', body: input, auth: true }).then((r) => r.order)
}

export function fetchMyOrders() {
  return apiRequest<{ orders: Order[] }>('/orders', { auth: true }).then((r) => r.orders)
}

export function fetchMyOrder(id: string) {
  return apiRequest<{ order: Order }>(`/orders/${id}`, { auth: true }).then((r) => r.order)
}

// ---- Admin ordering settings ----

export interface OrderingSetting {
  cutoffTime: string
  minAdvanceDays: number
  defaultDeliveryCost: number
  timezone: string
}

export function fetchOrderingSetting() {
  return apiRequest<{ setting: OrderingSetting }>('/admin/ordering-settings', { auth: true }).then((r) => r.setting)
}

export function updateOrderingSetting(input: OrderingSetting) {
  return apiRequest<{ setting: OrderingSetting }>('/admin/ordering-settings', {
    method: 'PUT',
    body: input,
    auth: true,
  }).then((r) => r.setting)
}

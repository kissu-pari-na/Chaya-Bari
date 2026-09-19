import { apiRequest } from './apiClient'
import type {
  Address,
  AddressInput,
  AdminOrder,
  CheckoutInput,
  Coupon,
  CouponInput,
  CouponPreview,
  GuestCheckoutInput,
  Order,
  OrderingWindow,
  OrderStatus,
  PaymentMode,
  PaymentStatus,
} from '../types/order'

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

export function updateAddress(id: string, input: Partial<AddressInput>) {
  return apiRequest<{ address: Address }>(`/addresses/${id}`, {
    method: 'PATCH',
    body: input,
    auth: true,
  }).then((r) => r.address)
}

export function deleteAddress(id: string) {
  return apiRequest<void>(`/addresses/${id}`, { method: 'DELETE', auth: true })
}

export function placeOrder(input: CheckoutInput) {
  return apiRequest<{ order: Order }>('/orders', { method: 'POST', body: input, auth: true }).then((r) => r.order)
}

/// Place an order as a guest (no account). Cash on delivery only.
export function placeGuestOrder(input: GuestCheckoutInput) {
  return apiRequest<{ order: Order }>('/guest/orders', { method: 'POST', body: input }).then((r) => r.order)
}

export function fetchMyOrders() {
  return apiRequest<{ orders: Order[] }>('/orders', { auth: true }).then((r) => r.orders)
}

export function fetchMyOrder(id: string) {
  return apiRequest<{ order: Order }>(`/orders/${id}`, { auth: true }).then((r) => r.order)
}

/// Customer switches their own order between pay-in-advance and cash-on-delivery
/// (allowed only while the order is still pending confirmation).
export function changeOrderPaymentMode(id: string, paymentMode: PaymentMode) {
  return apiRequest<{ order: Order }>(`/orders/${id}/payment-mode`, {
    method: 'PATCH',
    body: { paymentMode },
    auth: true,
  }).then((r) => r.order)
}

/// Customer cancels their own order (allowed only while still pending).
export function cancelMyOrder(id: string) {
  return apiRequest<{ order: Order }>(`/orders/${id}/cancel`, { method: 'POST', auth: true }).then((r) => r.order)
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

// ---- Coupons ----

export function previewCoupon(code: string, items: { productId: string; quantity: number }[]) {
  return apiRequest<CouponPreview>('/coupons/preview', { method: 'POST', body: { code, items }, auth: true })
}

export function fetchCoupons() {
  return apiRequest<{ coupons: Coupon[] }>('/admin/coupons', { auth: true }).then((r) => r.coupons)
}

export function createCoupon(input: CouponInput) {
  return apiRequest<{ coupon: Coupon }>('/admin/coupons', { method: 'POST', body: input, auth: true }).then(
    (r) => r.coupon,
  )
}

export function updateCoupon(id: string, input: CouponInput) {
  return apiRequest<{ coupon: Coupon }>(`/admin/coupons/${id}`, { method: 'PUT', body: input, auth: true }).then(
    (r) => r.coupon,
  )
}

export function deleteCoupon(id: string) {
  return apiRequest<void>(`/admin/coupons/${id}`, { method: 'DELETE', auth: true })
}

// ---- Admin order management ----

export interface OrderFilters {
  status?: OrderStatus
  paymentStatus?: PaymentStatus
  search?: string
  fromDate?: string
  toDate?: string
}

export function fetchAdminOrders(filters: OrderFilters = {}) {
  const params = new URLSearchParams()
  for (const [k, v] of Object.entries(filters)) if (v) params.set(k, v)
  const query = params.toString() ? `?${params.toString()}` : ''
  return apiRequest<{ orders: AdminOrder[] }>(`/admin/orders${query}`, { auth: true }).then((r) => r.orders)
}

export function fetchAdminOrder(id: string) {
  return apiRequest<{ order: AdminOrder }>(`/admin/orders/${id}`, { auth: true }).then((r) => r.order)
}

export function updateOrderStatus(id: string, status: OrderStatus) {
  return apiRequest<{ order: AdminOrder }>(`/admin/orders/${id}/status`, {
    method: 'PATCH',
    body: { status },
    auth: true,
  }).then((r) => r.order)
}

export function updateOrderPaymentStatus(id: string, paymentStatus: PaymentStatus) {
  return apiRequest<{ order: AdminOrder }>(`/admin/orders/${id}/payment-status`, {
    method: 'PATCH',
    body: { paymentStatus },
    auth: true,
  }).then((r) => r.order)
}

/// Admin switches an order between pay-in-advance and cash-on-delivery (allowed
/// only while the order is still pending confirmation).
export function updateOrderPaymentMode(id: string, paymentMode: PaymentMode) {
  return apiRequest<{ order: AdminOrder }>(`/admin/orders/${id}/payment-mode`, {
    method: 'PATCH',
    body: { paymentMode },
    auth: true,
  }).then((r) => r.order)
}

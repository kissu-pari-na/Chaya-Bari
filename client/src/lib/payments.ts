import { apiRequest } from './apiClient'
import type { BkashStart, ClaimPaymentInput, Payment, RecordPaymentInput } from '../types/payment'
import type { AdminOrder, Order } from '../types/order'

// ---- Admin ----

export function fetchPayments(orderId: string) {
  return apiRequest<{ payments: Payment[] }>(`/admin/orders/${orderId}/payments`, { auth: true }).then(
    (r) => r.payments,
  )
}

export function recordPayment(orderId: string, input: RecordPaymentInput) {
  return apiRequest<{ payment: Payment; order: AdminOrder }>(`/admin/orders/${orderId}/payments`, {
    method: 'POST',
    body: input,
    auth: true,
  })
}

export function deletePayment(id: string) {
  return apiRequest<void>(`/admin/payments/${id}`, { method: 'DELETE', auth: true })
}

/// Verify or reject a customer's pending manual payment claim.
export function verifyPayment(id: string, action: 'verify' | 'reject') {
  return apiRequest<{ payment: Payment; order: AdminOrder }>(`/admin/payments/${id}/verify`, {
    method: 'PATCH',
    body: { action },
    auth: true,
  })
}

// ---- Customer ----

/// Report a payment made directly (cash / transfer) — awaits admin verification.
export function submitClaim(orderId: string, input: ClaimPaymentInput) {
  return apiRequest<{ payment: Payment; order: Order }>(`/orders/${orderId}/payments/claim`, {
    method: 'POST',
    body: input,
    auth: true,
  })
}

/// Start a bKash online payment; returns the URL to redirect the customer to.
export function bkashCreate(orderId: string, callbackURL: string, amount?: number) {
  return apiRequest<BkashStart>(`/orders/${orderId}/payments/bkash/create`, {
    method: 'POST',
    body: { callbackURL, amount },
    auth: true,
  })
}

/// Complete a bKash payment after returning from the gateway.
export function bkashExecute(orderId: string, paymentID: string) {
  return apiRequest<{ status: 'completed' | 'failed'; payment: Payment; order: Order }>(
    `/orders/${orderId}/payments/bkash/execute`,
    { method: 'POST', body: { paymentID }, auth: true },
  )
}

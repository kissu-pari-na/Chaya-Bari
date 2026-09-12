import { apiRequest } from './apiClient'
import type { Payment, RecordPaymentInput } from '../types/payment'
import type { AdminOrder } from '../types/order'

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

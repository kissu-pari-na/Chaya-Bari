import { apiRequest } from './apiClient'
import type { PaymentInfo } from '../types/payment'

// The business's payment-account details (bKash/Nagad/Rocket/bank) that
// customers pay to manually. Money movements live in lib/wallet.ts.

/// Public: the account numbers customers send manual payments to.
export function fetchPaymentInfo() {
  return apiRequest<{ paymentInfo: PaymentInfo }>('/payment-info').then((r) => r.paymentInfo)
}

/// Admin: update the payment-account settings.
export function updatePaymentInfo(input: PaymentInfo) {
  return apiRequest<{ paymentInfo: PaymentInfo }>('/admin/payment-info', {
    method: 'PUT',
    body: input,
    auth: true,
  }).then((r) => r.paymentInfo)
}

import { apiRequest } from './apiClient'
import type { OrderStatus, PaymentMode } from '../types/order'
import type { WalletTotals } from '../types/payment'

/// The admin's "what needs me now" snapshot (server: orders/overview.service.ts).
export interface AdminOverview {
  today: string
  counts: {
    toConfirm: number
    awaitingPayment: number
    inKitchen: number
    readyToDispatch: number
    outForDelivery: number
    deliveredToday: number
    todaysOrders: number
  }
  wallet: WalletTotals
  needsAction: {
    id: string
    orderNumber: string
    recipientName: string
    total: number
    status: OrderStatus
    paymentMode: PaymentMode
    fulfillmentDate: string
    timeSlot: string | null
    reason: 'confirm' | 'payment' | 'dispatch' | 'deliver'
  }[]
}

export function fetchAdminOverview() {
  return apiRequest<{ overview: AdminOverview }>('/admin/overview', { auth: true }).then((r) => r.overview)
}

import type { OrderStatus, PaymentStatus } from '../types/order'

export const orderStatuses: OrderStatus[] = [
  'PENDING',
  'CONFIRMED',
  'PREPARING',
  'PACKED',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
  'CANCELLED',
]

export const paymentStatuses: PaymentStatus[] = ['PENDING', 'PAID', 'PARTIALLY_PAID', 'REFUNDED', 'FAILED']

/// Allowed next statuses (mirrors the server's transition rules) for building
/// the admin status controls. CANCELLED is available from any non-terminal state.
export const nextStatuses: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['PREPARING', 'CANCELLED'],
  PREPARING: ['PACKED', 'CANCELLED'],
  PACKED: ['OUT_FOR_DELIVERY', 'CANCELLED'],
  OUT_FOR_DELIVERY: ['DELIVERED', 'CANCELLED'],
  DELIVERED: [],
  CANCELLED: [],
}

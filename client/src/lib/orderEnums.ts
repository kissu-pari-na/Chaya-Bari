import type { OrderStatus, PaymentStatus } from '../types/order'

export const orderStatuses: OrderStatus[] = [
  'PENDING',
  'CONFIRMED',
  'PREPARING',
  'READY',
  'PACKED',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
  'CANCELLED',
]

export const paymentStatuses: PaymentStatus[] = ['PENDING', 'PAID', 'PARTIALLY_PAID', 'REFUNDED', 'FAILED']

/// Allowed next statuses (mirrors the server's transition rules) for building
/// the admin status controls. An order can only be CANCELLED while it is still
/// PENDING or CONFIRMED — once preparing has started it can no longer be
/// cancelled. CANCELLED and DELIVERED are terminal.
export const nextStatuses: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['PREPARING', 'CANCELLED'],
  PREPARING: ['READY'],
  READY: ['PACKED'],
  PACKED: ['OUT_FOR_DELIVERY'],
  OUT_FOR_DELIVERY: ['DELIVERED'],
  DELIVERED: [],
  CANCELLED: [],
}

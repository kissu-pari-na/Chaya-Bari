import type { OrderStatus, PaymentMode, PaymentStatus } from '../types/order'

/// The five steps (+ cancelled), in order (vault D-ORD-003).
export const orderStatuses: OrderStatus[] = ['PENDING', 'CONFIRMED', 'PREPARING', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED']

export const paymentStatuses: PaymentStatus[] = ['PENDING', 'PAID', 'ON_WALLET', 'REFUNDED']

export const paymentModes: PaymentMode[] = ['PAY_FIRST', 'PAY_LATER', 'COD']

/// Allowed next statuses (mirrors the server's transitions). Admins may dispatch
/// straight from CONFIRMED when nothing needs cooking. Cancelling is possible
/// only while PENDING or CONFIRMED; DELIVERED and CANCELLED are terminal.
export const nextStatuses: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['PREPARING', 'OUT_FOR_DELIVERY', 'CANCELLED'],
  PREPARING: ['OUT_FOR_DELIVERY'],
  OUT_FOR_DELIVERY: ['DELIVERED'],
  DELIVERED: [],
  CANCELLED: [],
}

import { Prisma, type OrderStatus } from '@prisma/client'
import { prisma } from '../../lib/prisma.js'
import { HttpError } from '../../utils/httpError.js'
import type { PublicOrder } from './order.service.js'
import { netPaid, paymentTotals, recomputeOrderPaymentStatus, toPublicPayment } from '../payments/payment.service.js'
import { notifyOrderStatus } from '../notifications/notification.service.js'

export interface AdminOrder extends PublicOrder {
  customer: {
    /// Null for a guest order (no account).
    id: string | null
    name: string
    email: string | null
    phone: string | null
    isGuest: boolean
  }
}

const orderWithRelations = {
  items: true,
  customer: { include: { user: true } },
  delivery: true,
  payments: true,
} satisfies Prisma.OrderInclude

type OrderRow = Prisma.OrderGetPayload<{ include: typeof orderWithRelations }>

function toAdminOrder(order: OrderRow): AdminOrder {
  const totals = paymentTotals(order.payments, order.total)
  return {
    id: order.id,
    orderNumber: order.orderNumber,
    recipientName: order.recipientName,
    recipientPhone: order.recipientPhone,
    addressLine: order.addressLine,
    area: order.area,
    city: order.city,
    addressNote: order.addressNote,
    fulfillmentDate: order.fulfillmentDate.toISOString().slice(0, 10),
    timeSlot: order.timeSlot,
    notes: order.notes,
    subtotal: Number(order.subtotal),
    productDiscount: Number(order.productDiscount),
    customerDeliveryCost: Number(order.customerDeliveryCost),
    deliveryDiscount: Number(order.deliveryDiscount),
    total: Number(order.total),
    couponCode: order.couponCode,
    status: order.status,
    paymentStatus: order.paymentStatus,
    paymentMode: order.paymentMode,
    amountPaid: totals.amountPaid,
    amountDue: totals.amountDue,
    createdAt: order.createdAt.toISOString(),
    items: order.items.map((i) => ({
      id: i.id,
      productId: i.productId,
      productName: i.productName,
      listUnitPrice: Number(i.listUnitPrice),
      unitPrice: Number(i.unitPrice),
      quantity: i.quantity,
      lineTotal: Number(i.lineTotal),
    })),
    delivery: order.delivery
      ? { status: order.delivery.status, provider: order.delivery.provider, trackingRef: order.delivery.trackingRef }
      : null,
    payments: order.payments.map(toPublicPayment),
    // Guest orders have no customer account; fall back to the delivery snapshot
    // and the optional guest email so the admin still sees who to contact.
    customer: order.customer
      ? {
          id: order.customer.id,
          name: order.customer.user.name,
          email: order.customer.user.email,
          phone: order.customer.user.phone,
          isGuest: false,
        }
      : {
          id: null,
          name: order.recipientName,
          email: order.guestEmail,
          phone: order.recipientPhone,
          isGuest: true,
        },
  }
}

export interface OrderFilters {
  status?: OrderStatus
  paymentStatus?: string
  search?: string
  fromDate?: string
  toDate?: string
}

export async function listOrders(filters: OrderFilters): Promise<AdminOrder[]> {
  const where: Prisma.OrderWhereInput = {}
  if (filters.status) where.status = filters.status
  if (filters.paymentStatus) where.paymentStatus = filters.paymentStatus as never
  if (filters.fromDate || filters.toDate) {
    where.fulfillmentDate = {}
    if (filters.fromDate) where.fulfillmentDate.gte = new Date(`${filters.fromDate}T00:00:00.000Z`)
    if (filters.toDate) where.fulfillmentDate.lte = new Date(`${filters.toDate}T00:00:00.000Z`)
  }
  if (filters.search) {
    const q = filters.search
    where.OR = [
      { orderNumber: { contains: q, mode: 'insensitive' } },
      { recipientName: { contains: q, mode: 'insensitive' } },
      { recipientPhone: { contains: q, mode: 'insensitive' } },
      { customer: { user: { name: { contains: q, mode: 'insensitive' } } } },
      { customer: { user: { email: { contains: q, mode: 'insensitive' } } } },
    ]
  }

  const orders = await prisma.order.findMany({
    where,
    include: orderWithRelations,
    orderBy: { createdAt: 'desc' },
  })
  return orders.map(toAdminOrder)
}

export async function getOrder(id: string): Promise<AdminOrder> {
  const order = await prisma.order.findUnique({ where: { id }, include: orderWithRelations })
  if (!order) throw HttpError.notFound('Order not found')
  return toAdminOrder(order)
}

// Allowed forward transitions. An order can only be CANCELLED while it is still
// PENDING or CONFIRMED — once it reaches PREPARING (or beyond) it can no longer
// be cancelled. CANCELLED and DELIVERED are terminal (everything is locked).
const transitions: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['PREPARING', 'CANCELLED'],
  PREPARING: ['READY'],
  READY: ['PACKED'],
  PACKED: ['OUT_FOR_DELIVERY'],
  OUT_FOR_DELIVERY: ['DELIVERED'],
  DELIVERED: [],
  CANCELLED: [],
}

export async function updateStatus(id: string, status: OrderStatus): Promise<AdminOrder> {
  const order = await prisma.order.findUnique({ where: { id } })
  if (!order) throw HttpError.notFound('Order not found')
  if (order.status !== status && !transitions[order.status].includes(status)) {
    // Give a clearer reason for the common "too late to cancel" case.
    if (status === 'CANCELLED') {
      throw HttpError.badRequest('This order can no longer be cancelled — it is already being prepared.')
    }
    throw HttpError.badRequest(`Cannot change status from ${order.status} to ${status}`)
  }
  // Prepaid orders can't be confirmed until fully paid. Cash-on-delivery orders
  // are collected at the door, so they skip this gate and can be confirmed and
  // sent to the kitchen while still unpaid.
  if (status === 'CONFIRMED' && order.paymentMode !== 'COD' && order.paymentStatus !== 'PAID') {
    throw HttpError.badRequest('Cannot confirm this order until payment is completed in full')
  }
  // Cancelling requires the order to owe nothing to the customer: any money
  // collected must be refunded first, so a cancelled order never strands a
  // refund (nothing can change once it is cancelled).
  if (status === 'CANCELLED') {
    const payments = await prisma.payment.findMany({ where: { orderId: id } })
    if (netPaid(payments).gt(0)) {
      throw HttpError.badRequest('Refund the paid amount before cancelling this order.')
    }
  }
  // Stamp the delivery time on first transition to DELIVERED; it drives the
  // day-after review invite.
  const markDelivered = status === 'DELIVERED' && !order.deliveredAt
  await prisma.order.update({
    where: { id },
    data: { status, ...(markDelivered ? { deliveredAt: new Date() } : {}) },
  })
  if (order.status !== status) {
    await notifyOrderStatus(order.customerId, status, order.orderNumber, order.id)
  }
  return getOrder(id)
}

export async function updatePaymentStatus(id: string, paymentStatus: string): Promise<AdminOrder> {
  const order = await prisma.order.findUnique({ where: { id } })
  if (!order) throw HttpError.notFound('Order not found')
  if (order.status === 'CANCELLED') {
    throw HttpError.badRequest('This order is cancelled — no further changes are allowed.')
  }
  await prisma.order.update({ where: { id }, data: { paymentStatus: paymentStatus as never } })
  return getOrder(id)
}

/// Admin switches an order between pay-in-advance and cash-on-delivery. Only
/// allowed while the order is still PENDING (before it is confirmed); once it has
/// moved past confirmation the payment method is locked.
export async function updatePaymentMode(id: string, paymentMode: 'PREPAID' | 'COD'): Promise<AdminOrder> {
  const order = await prisma.order.findUnique({ where: { id } })
  if (!order) throw HttpError.notFound('Order not found')
  if (order.status !== 'PENDING') {
    throw HttpError.badRequest('Payment method can only be changed before the order is confirmed')
  }
  if (order.paymentMode !== paymentMode) {
    await prisma.order.update({ where: { id }, data: { paymentMode } })
    await recomputeOrderPaymentStatus(id)
  }
  return getOrder(id)
}

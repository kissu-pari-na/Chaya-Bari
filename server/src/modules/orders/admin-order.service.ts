import { Prisma, type OrderStatus } from '@prisma/client'
import { prisma } from '../../lib/prisma.js'
import { HttpError } from '../../utils/httpError.js'
import {
  generateOrderNumber,
  itemsCreate,
  priceCheckout,
  resolveAddress,
  type PublicOrder,
} from './order.service.js'
import type { AdminCheckoutInput } from './order.schemas.js'
import { isOrderableArea } from './delivery-areas.js'
import { isOrbitaxEmail } from '../../utils/orbitax.js'
import { netPaid, paymentTotals, recomputeOrderPaymentStatus, toPublicPayment } from '../payments/payment.service.js'
import { notifyOrderPlaced, notifyOrderStatus } from '../notifications/notification.service.js'
import { findOrCreateCustomerForEmail } from '../customers/customer-account.service.js'
import { ensureTrackingToken, sendOrderConfirmedEmail, trackingLink } from './tracking.service.js'

export interface AdminOrder extends PublicOrder {
  customer: {
    /// Null for a guest order (no account).
    id: string | null
    name: string
    email: string | null
    phone: string | null
    isGuest: boolean
    /// An account an admin opened for this email that its owner hasn't claimed
    /// (registered / confirmed) yet.
    isPlaceholder: boolean
  }
  /// The admin who placed this order on the customer's behalf, if any.
  placedBy: { id: string; name: string } | null
  /// Public tracking link (no login needed); set once the order is confirmed.
  trackingUrl: string | null
  /// When the "order confirmed" email with that link was sent.
  confirmationEmailSentAt: string | null
}

const orderWithRelations = {
  items: true,
  customer: { include: { user: true } },
  delivery: true,
  payments: true,
  placedBy: { select: { id: true, name: true } },
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
          // Placeholders have no phone of their own; the order snapshot does.
          phone: order.customer.user.phone ?? order.recipientPhone,
          isGuest: false,
          isPlaceholder: order.customer.user.isPlaceholder,
        }
      : {
          id: null,
          name: order.recipientName,
          email: order.guestEmail,
          phone: order.recipientPhone,
          isGuest: true,
          isPlaceholder: false,
        },
    placedBy: order.placedBy,
    trackingUrl: order.trackingToken ? trackingLink(order.trackingToken) : null,
    confirmationEmailSentAt: order.confirmationEmailSentAt?.toISOString() ?? null,
  }
}

export interface OrderFilters {
  status?: OrderStatus
  paymentStatus?: string
  search?: string
  fromDate?: string
  toDate?: string
  limit?: number
  offset?: number
}

export async function listOrders(filters: OrderFilters): Promise<{ items: AdminOrder[]; total: number }> {
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
      { guestEmail: { contains: q, mode: 'insensitive' } },
    ]
  }

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      include: orderWithRelations,
      orderBy: { createdAt: 'desc' },
      ...(filters.limit !== undefined ? { take: filters.limit, skip: filters.offset ?? 0 } : {}),
    }),
    prisma.order.count({ where }),
  ])
  return { items: orders.map(toAdminOrder), total }
}

export async function getOrder(id: string): Promise<AdminOrder> {
  const order = await prisma.order.findUnique({ where: { id }, include: orderWithRelations })
  if (!order) throw HttpError.notFound('Order not found')
  // Orders confirmed before tracking links existed get one on first view.
  if (!order.trackingToken && order.status !== 'PENDING' && order.status !== 'CANCELLED') {
    order.trackingToken = await ensureTrackingToken(order.id)
  }
  return toAdminOrder(order)
}

/// Admin places an order on a customer's behalf, keyed by their email. The
/// order belongs to that email's customer account from the start — opening a
/// placeholder account if there isn't one — so when the person later registers
/// (or signs in with Google) with that email, it is already in their history.
export async function createOrderOnBehalf(input: AdminCheckoutInput, adminId: string): Promise<AdminOrder> {
  const { customerId, user } = await findOrCreateCustomerForEmail(input.customer, adminId)
  const address = await resolveAddress(customerId, input.addressId, input.address)
  if (!address.recipientPhone) address.recipientPhone = user.phone ?? ''
  if (!address.recipientPhone) {
    throw HttpError.badRequest('A phone number is required for delivery')
  }
  if (!isOrderableArea(address.area, isOrbitaxEmail(user.email))) {
    throw HttpError.badRequest("We don't deliver to this area. Please choose an address in one of our delivery areas.")
  }

  const { priced, fulfillmentDate } = await priceCheckout(input, { overrideCutoff: input.overrideCutoff })

  // Keep a new address in the customer's address book (once), so it's there
  // for the next order — and for the owner once they claim the account.
  if (!input.addressId && input.address && input.saveAddress) {
    const duplicate = await prisma.address.findFirst({
      where: { customerId, addressLine: address.addressLine, area: address.area, city: address.city },
    })
    if (!duplicate) {
      const hasAny = (await prisma.address.count({ where: { customerId } })) > 0
      await prisma.address.create({
        data: {
          customerId,
          label: input.address.label,
          recipientName: address.recipientName,
          recipientPhone: address.recipientPhone,
          addressLine: address.addressLine,
          area: address.area,
          city: address.city,
          note: address.addressNote,
          isDefault: !hasAny,
        },
      })
    }
  }

  const order = await prisma.order.create({
    data: {
      orderNumber: generateOrderNumber(),
      customerId,
      placedById: adminId,
      ...address,
      fulfillmentDate,
      timeSlot: input.timeSlot,
      notes: input.notes,
      subtotal: priced.subtotal,
      productDiscount: priced.productDiscount,
      customerDeliveryCost: priced.customerDeliveryCost,
      deliveryDiscount: priced.deliveryDiscount,
      total: priced.total,
      couponCode: priced.couponCode,
      paymentMode: input.paymentMode,
      items: itemsCreate(priced),
    },
  })

  // In-app notification waits in the customer's inbox (a placeholder sees it
  // once claimed); other admins hear about the new order as usual.
  await notifyOrderPlaced(customerId, order.orderNumber, order.id)

  return getOrder(order.id)
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
  // Cancelling requires the payment situation to be settled first, so a cancelled
  // order never strands money (nothing can change once it is cancelled):
  //  - any payment awaiting verification must be verified or rejected first;
  //  - any amount actually collected must be refunded first.
  if (status === 'CANCELLED') {
    const payments = await prisma.payment.findMany({ where: { orderId: id } })
    if (payments.some((p) => p.status === 'PENDING')) {
      throw HttpError.badRequest('Verify or reject the pending payment before cancelling this order.')
    }
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
    // First confirmation: email the customer their tracking link.
    if (status === 'CONFIRMED') await sendOrderConfirmedEmail(order.id)
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

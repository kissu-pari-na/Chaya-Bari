import { Prisma, type OrderStatus } from '@prisma/client'
import { prisma } from '../../lib/prisma.js'
import { HttpError } from '../../utils/httpError.js'
import {
  assertPayLaterAllowed,
  finalizePayment,
  generateOrderNumber,
  itemsCreate,
  priceCheckout,
  resolveAddress,
  toOrderPayment,
  type PublicOrder,
} from './order.service.js'
import type { AdminCheckoutInput } from './order.schemas.js'
import { orderMoney } from '../wallet/order-money.js'
import { actorOf, changeMode, collectOnDelivery, reverseOrderCharge } from '../wallet/wallet.service.js'
import { isOrderableArea } from './delivery-areas.js'
import { isOrbitaxEmail } from '../../utils/orbitax.js'
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
  walletEntries: true,
  placedBy: { select: { id: true, name: true } },
} satisfies Prisma.OrderInclude

type OrderRow = Prisma.OrderGetPayload<{ include: typeof orderWithRelations }>

function toAdminOrder(order: OrderRow): AdminOrder {
  const totals = orderMoney(order, order.walletEntries)
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
    onWallet: totals.onWallet,
    createdAt: order.createdAt.toISOString(),
    readyAt: order.readyAt?.toISOString() ?? null,
    dispatchedAt: order.dispatchedAt?.toISOString() ?? null,
    deliveredAt: order.deliveredAt?.toISOString() ?? null,
    items: order.items.map((i) => ({
      id: i.id,
      productId: i.productId,
      productName: i.productName,
      listUnitPrice: Number(i.listUnitPrice),
      unitPrice: Number(i.unitPrice),
      quantity: i.quantity,
      lineTotal: Number(i.lineTotal),
    })),
    delivery: order.delivery ? { provider: order.delivery.provider, trackingRef: order.delivery.trackingRef } : null,
    payments: order.walletEntries
      .slice()
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
      .map(toOrderPayment),
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

  const { priced, fulfillmentDate } = await priceCheckout(input, { byAdmin: true })
  if (input.paymentMode === 'PAY_LATER') await assertPayLaterAllowed(customerId, priced.total)

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

  await finalizePayment(order.id)
  // In-app notification waits in the customer's inbox (a placeholder sees it
  // once claimed); other admins hear about the new order as usual.
  await notifyOrderPlaced(customerId, order.orderNumber, order.id)

  return getOrder(order.id)
}

// The five-step order flow (vault R-ORD-001): every role sees the same states.
// Admins may dispatch straight from CONFIRMED when nothing needs cooking.
// An order can be cancelled only while PENDING or CONFIRMED; CANCELLED and
// DELIVERED are terminal.
const transitions: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['PREPARING', 'OUT_FOR_DELIVERY', 'CANCELLED'],
  PREPARING: ['OUT_FOR_DELIVERY'],
  OUT_FOR_DELIVERY: ['DELIVERED'],
  DELIVERED: [],
  CANCELLED: [],
}

export interface StatusChange {
  status: OrderStatus
  /// OUT_FOR_DELIVERY: who is delivering and their tracking reference.
  provider?: string
  trackingRef?: string
  /// DELIVERED (cash on delivery): money collected at the door.
  collected?: number
  collectMethod?: 'CASH' | 'BKASH' | 'NAGAD' | 'ROCKET' | 'BANK'
  collectReference?: string
}

export async function updateStatus(id: string, change: StatusChange, adminId: string): Promise<AdminOrder> {
  const { status } = change
  const order = await prisma.order.findUnique({ where: { id } })
  if (!order) throw HttpError.notFound('Order not found')
  if (order.status === status) return getOrder(id)
  if (!transitions[order.status].includes(status)) {
    if (status === 'CANCELLED') {
      throw HttpError.badRequest('This order can no longer be cancelled — it is already being prepared.')
    }
    throw HttpError.badRequest(`Cannot change status from ${order.status} to ${status}`)
  }
  // Pay-first orders confirm themselves once paid (vault R-ORD-002).
  if (status === 'CONFIRMED' && order.paymentMode === 'PAY_FIRST' && order.paymentStatus !== 'PAID') {
    throw HttpError.badRequest('This order is pay-first: confirm its payment first and it will confirm automatically.')
  }

  const now = new Date()
  if (status === 'OUT_FOR_DELIVERY') {
    // The delivery record holds who delivers it (no separate delivery status).
    await prisma.delivery.upsert({
      where: { orderId: id },
      create: {
        orderId: id,
        provider: change.provider ?? null,
        trackingRef: change.trackingRef ?? null,
        customerDeliveryCost: order.customerDeliveryCost.sub(order.deliveryDiscount),
      },
      update: {
        ...(change.provider !== undefined ? { provider: change.provider } : {}),
        ...(change.trackingRef !== undefined ? { trackingRef: change.trackingRef } : {}),
      },
    })
  }

  await prisma.order.update({
    where: { id },
    data: {
      status,
      ...(status === 'OUT_FOR_DELIVERY' && !order.dispatchedAt ? { dispatchedAt: now } : {}),
      // Stamped on the first DELIVERED only; it drives the day-after review invite.
      ...(status === 'DELIVERED' && !order.deliveredAt ? { deliveredAt: now } : {}),
    },
  })

  if (status === 'DELIVERED' && order.paymentMode === 'COD') {
    const admin = await actorOf(adminId)
    await collectOnDelivery(order, change.collected ?? Number(order.total), admin, change.collectMethod ?? 'CASH', change.collectReference)
  }
  if (status === 'CANCELLED') await reverseOrderCharge(id)

  await notifyOrderStatus(order.customerId, status, order.orderNumber, order.id)
  // First confirmation: email the customer their tracking link.
  if (status === 'CONFIRMED') await sendOrderConfirmedEmail(order.id)
  return getOrder(id)
}

/// Admin switches an order's payment method. Only while it is still PENDING;
/// pay later is re-checked against the customer's wallet limit.
export async function updatePaymentMode(id: string, paymentMode: AdminOrder['paymentMode']): Promise<AdminOrder> {
  await changeMode(id, paymentMode)
  return getOrder(id)
}

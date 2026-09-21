import { type Delivery, type Order, type OrderItem, type Payment } from '@prisma/client'
import { prisma } from '../../lib/prisma.js'
import { HttpError } from '../../utils/httpError.js'
import type { AddressInput, CheckoutInput, GuestCheckoutInput } from './order.schemas.js'
import { getOrderingSetting, computeWindow } from './ordering.service.js'
import { isSlotEnabledForDate } from './slots.js'
import { priceOrder } from './pricing.js'
import { isOrderableArea } from './delivery-areas.js'
import { isOrbitaxEmail } from '../../utils/orbitax.js'
import { findUsableCoupon } from '../coupons/coupon.service.js'
import { netPaid, paymentTotals, recomputeOrderPaymentStatus, toPublicPayment, type PublicPayment } from '../payments/payment.service.js'
import {
  notifyOrderPlaced,
  notifyNewOrderToAdmins,
  notifyOrderStatus,
  notifyOrderCancelledByCustomer,
} from '../notifications/notification.service.js'

interface AddressSnapshot {
  recipientName: string
  recipientPhone: string
  addressLine: string
  area: string | null
  city: string
  addressNote: string | null
}

export interface PublicOrderItem {
  id: string
  productId: string | null
  productName: string
  listUnitPrice: number
  unitPrice: number
  quantity: number
  lineTotal: number
}

export interface PublicOrder {
  id: string
  orderNumber: string
  recipientName: string
  recipientPhone: string
  addressLine: string
  area: string | null
  city: string
  addressNote: string | null
  fulfillmentDate: string
  timeSlot: string | null
  notes: string | null
  subtotal: number
  productDiscount: number
  customerDeliveryCost: number
  deliveryDiscount: number
  total: number
  couponCode: string | null
  status: Order['status']
  paymentStatus: Order['paymentStatus']
  paymentMode: Order['paymentMode']
  amountPaid: number
  amountDue: number
  createdAt: string
  items: PublicOrderItem[]
  /// Read-only delivery summary for the customer (no cost details).
  delivery: { status: Delivery['status']; provider: string | null; trackingRef: string | null } | null
  /// The customer's payment records for this order (claims + settled payments).
  payments: PublicPayment[]
}

type OrderWithItems = Order & { items: OrderItem[]; delivery?: Delivery | null; payments?: Payment[] }

function toPublicOrder(order: OrderWithItems): PublicOrder {
  const totals = paymentTotals(order.payments ?? [], order.total)
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
    payments: (order.payments ?? [])
      .slice()
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
      .map(toPublicPayment),
  }
}

async function resolveAddress(
  customerId: string,
  addressId?: string,
  inline?: AddressInput,
): Promise<AddressSnapshot> {
  if (addressId) {
    const address = await prisma.address.findUnique({ where: { id: addressId } })
    if (!address || address.customerId !== customerId) {
      throw HttpError.badRequest('Selected address not found')
    }
    return {
      recipientName: address.recipientName,
      recipientPhone: address.recipientPhone,
      addressLine: address.addressLine,
      area: address.area,
      city: address.city,
      addressNote: address.note,
    }
  }
  if (inline) {
    return {
      recipientName: inline.recipientName,
      recipientPhone: inline.recipientPhone ?? '',
      addressLine: inline.addressLine,
      area: inline.area ?? null,
      city: inline.city,
      addressNote: inline.note ?? null,
    }
  }
  throw HttpError.badRequest('A delivery address is required')
}

function generateOrderNumber(): string {
  const now = new Date()
  const yy = String(now.getUTCFullYear()).slice(2)
  const mm = String(now.getUTCMonth() + 1).padStart(2, '0')
  const dd = String(now.getUTCDate()).padStart(2, '0')
  const rand = Math.floor(1000 + Math.random() * 9000)
  return `CB-${yy}${mm}${dd}-${rand}`
}

interface CheckoutItem {
  productId: string
  quantity: number
}

/// Validates the advance-order window + time slot and prices the cart. Shared by
/// the registered-customer and guest checkout flows.
async function priceCheckout(input: {
  items: CheckoutItem[]
  fulfillmentDate: string
  timeSlot: string
  couponCode?: string
}) {
  const setting = await getOrderingSetting()
  const window = computeWindow(setting)

  // Enforce the advance-order cutoff rule.
  if (input.fulfillmentDate < window.earliestFulfillmentDate) {
    throw HttpError.badRequest(
      `Orders must be placed for ${window.earliestFulfillmentDate} or later (cutoff ${window.cutoffTime}).`,
      { earliestFulfillmentDate: window.earliestFulfillmentDate },
    )
  }

  // The chosen slot must be one that is actually open for that weekday.
  if (!isSlotEnabledForDate(input.fulfillmentDate, input.timeSlot)) {
    throw HttpError.badRequest('The selected time slot is not available for that day.')
  }

  // Load products; the pricing helper captures list + charged prices and
  // applies per-item sale prices plus an optional coupon (immutability).
  const productIds = input.items.map((i) => i.productId)
  const products = await prisma.product.findMany({ where: { id: { in: productIds } } })
  const coupon = input.couponCode ? await findUsableCoupon(input.couponCode) : null

  const priced = priceOrder({
    items: input.items,
    products: new Map(products.map((p) => [p.id, p])),
    deliveryCost: setting.defaultDeliveryCost,
    coupon,
  })

  const [year, month, day] = input.fulfillmentDate.split('-').map(Number)
  const fulfillmentDate = new Date(Date.UTC(year, month - 1, day))

  return { priced, fulfillmentDate }
}

/// Build the nested item-create payload from priced lines.
function itemsCreate(priced: Awaited<ReturnType<typeof priceCheckout>>['priced']) {
  return {
    create: priced.lines.map((l) => ({
      productId: l.productId,
      productName: l.productName,
      listUnitPrice: l.listUnitPrice,
      unitPrice: l.unitPrice,
      quantity: l.quantity,
      lineTotal: l.lineTotal,
    })),
  }
}

export async function checkout(customerId: string, input: CheckoutInput): Promise<PublicOrder> {
  const address = await resolveAddress(customerId, input.addressId, input.address)
  const customer = await prisma.customer.findUnique({ where: { id: customerId }, include: { user: true } })
  const userEmail = customer?.user.email ?? null

  // We only deliver to serviceable areas (orbitax.com accounts may also order to
  // the Mohakhali office). Reject anything outside coverage before creating it.
  if (!isOrderableArea(address.area, isOrbitaxEmail(userEmail))) {
    throw HttpError.badRequest(
      "Sorry, we don't deliver to this area yet. Please choose an address in one of our delivery areas.",
    )
  }

  // If the selected address has no phone, fall back to the customer's profile
  // number (which, when it was missing, has just been captured at checkout) and
  // persist it back onto the saved address so it's there next time.
  if (!address.recipientPhone) {
    const profilePhone = customer?.user.phone ?? ''
    if (profilePhone) {
      address.recipientPhone = profilePhone
      if (input.addressId) {
        await prisma.address.update({ where: { id: input.addressId }, data: { recipientPhone: profilePhone } })
      }
    }
  }

  const { priced, fulfillmentDate } = await priceCheckout(input)

  const order = await prisma.order.create({
    data: {
      orderNumber: generateOrderNumber(),
      customerId,
      recipientName: address.recipientName,
      recipientPhone: address.recipientPhone,
      addressLine: address.addressLine,
      area: address.area,
      city: address.city,
      addressNote: address.addressNote,
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
    include: { items: true },
  })

  await notifyOrderPlaced(customerId, order.orderNumber, order.id)

  return toPublicOrder(order)
}

/// Guest checkout: places an order without an account. Contact/address come in
/// inline. A guest can pay in advance (shown manual-payment instructions on the
/// confirmation) or pick cash on delivery. Only admins are notified — there is
/// no customer account to notify.
export async function guestCheckout(input: GuestCheckoutInput): Promise<PublicOrder> {
  // Guests can only order to serviceable areas (no orbitax office exception —
  // that is for signed-in orbitax accounts).
  if (!isOrderableArea(input.address.area, false)) {
    throw HttpError.badRequest(
      "Sorry, we don't deliver to this area yet. Please choose an address in one of our delivery areas.",
    )
  }
  const { priced, fulfillmentDate } = await priceCheckout(input)

  const order = await prisma.order.create({
    data: {
      orderNumber: generateOrderNumber(),
      customerId: null,
      guestEmail: input.guestEmail,
      recipientName: input.address.recipientName,
      recipientPhone: input.address.recipientPhone ?? '',
      addressLine: input.address.addressLine,
      area: input.address.area ?? null,
      city: input.address.city,
      addressNote: input.address.note ?? null,
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
    include: { items: true },
  })

  await notifyNewOrderToAdmins(order.orderNumber, order.id)

  return toPublicOrder(order)
}

export async function listMyOrders(
  customerId: string,
  page?: { limit: number; offset: number },
): Promise<{ items: PublicOrder[]; total: number }> {
  const where = { customerId }
  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      include: { items: true, delivery: true, payments: true },
      orderBy: { createdAt: 'desc' },
      ...(page ? { take: page.limit, skip: page.offset } : {}),
    }),
    prisma.order.count({ where }),
  ])
  return { items: orders.map(toPublicOrder), total }
}

export async function getMyOrder(customerId: string, id: string): Promise<PublicOrder> {
  const order = await prisma.order.findUnique({ where: { id }, include: { items: true, delivery: true, payments: true } })
  if (!order || order.customerId !== customerId) {
    throw HttpError.notFound('Order not found')
  }
  return toPublicOrder(order)
}

/// Customer cancels their own order. Allowed only while it is still PENDING
/// (not yet confirmed). If any money has been paid, a refund is involved, so the
/// customer must contact the business instead of self-cancelling — this keeps a
/// cancelled order from stranding a refund.
export async function cancelOrder(customerId: string, id: string): Promise<PublicOrder> {
  const order = await prisma.order.findUnique({ where: { id } })
  if (!order || order.customerId !== customerId) throw HttpError.notFound('Order not found')
  if (order.status !== 'PENDING') {
    throw HttpError.badRequest(
      'This order can no longer be cancelled. Please contact us if you still need to cancel it.',
    )
  }
  const payments = await prisma.payment.findMany({ where: { orderId: id } })
  if (payments.some((p) => p.status === 'PENDING')) {
    throw HttpError.badRequest(
      'You have a payment awaiting verification. Please contact us to cancel this order.',
    )
  }
  if (netPaid(payments).gt(0)) {
    throw HttpError.badRequest(
      'You have already paid for this order. Please contact us to cancel it and arrange a refund.',
    )
  }
  await prisma.order.update({ where: { id }, data: { status: 'CANCELLED' } })
  await notifyOrderStatus(customerId, 'CANCELLED', order.orderNumber, order.id)
  await notifyOrderCancelledByCustomer(order.orderNumber, order.id)
  return getMyOrder(customerId, id)
}

/// Customer switches their own order between pay-in-advance and cash-on-delivery.
/// Only allowed while the order is still PENDING (awaiting admin confirmation);
/// once it has been confirmed and moved on, the payment method is locked.
export async function changePaymentMode(
  customerId: string,
  id: string,
  paymentMode: 'PREPAID' | 'COD',
): Promise<PublicOrder> {
  const order = await prisma.order.findUnique({ where: { id } })
  if (!order || order.customerId !== customerId) throw HttpError.notFound('Order not found')
  if (order.status !== 'PENDING') {
    throw HttpError.badRequest('Payment method can only be changed before the order is confirmed')
  }
  if (order.paymentMode !== paymentMode) {
    await prisma.order.update({ where: { id }, data: { paymentMode } })
    // Switching to prepaid can auto-confirm an already fully-paid order; switching
    // to COD leaves the status alone. Recompute keeps the invariants consistent.
    await recomputeOrderPaymentStatus(id)
  }
  return getMyOrder(customerId, id)
}

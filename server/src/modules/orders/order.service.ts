import { type Delivery, type Order, type OrderItem, type WalletEntry } from '@prisma/client'
import { prisma } from '../../lib/prisma.js'
import { HttpError } from '../../utils/httpError.js'
import type { AddressInput, CheckoutInput, GuestCheckoutInput } from './order.schemas.js'
import { getOrderingSetting, computeWindow, todayInZone } from './ordering.service.js'
import { isSlotEnabledForDate } from './slots.js'
import { priceOrder } from './pricing.js'
import { isOrderableArea } from './delivery-areas.js'
import { isOrbitaxEmail } from '../../utils/orbitax.js'
import { findUsableCoupon } from '../coupons/coupon.service.js'
import { orderMoney } from '../wallet/order-money.js'
import { applyPaymentMode, balanceOf, changeMode, limitOf, reverseOrderCharge } from '../wallet/wallet.service.js'
import {
  notifyOrderPlaced,
  notifyNewOrderToAdmins,
  notifyOrderStatus,
  notifyOrderCancelledByCustomer,
} from '../notifications/notification.service.js'

export interface AddressSnapshot {
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
  /// Part of the order charged to the wallet (pay later, or cash collected short).
  onWallet: number
  createdAt: string
  /// Kitchen packed it; ready to dispatch (status stays PREPARING).
  readyAt: string | null
  dispatchedAt: string | null
  deliveredAt: string | null
  items: PublicOrderItem[]
  /// Read-only delivery summary for the customer (no cost details).
  delivery: { provider: string | null; trackingRef: string | null } | null
  /// Money movements for this order (charges, payments, claims, refunds).
  payments: OrderPayment[]
}

/// A wallet entry as seen on an order page.
export interface OrderPayment {
  id: string
  type: WalletEntry['type']
  status: WalletEntry['status']
  amount: number
  method: WalletEntry['method']
  reference: string | null
  note: string | null
  source: WalletEntry['source']
  createdAt: string
  createdByName: string | null
  reviewedByName: string | null
  reviewNote: string | null
}

export function toOrderPayment(e: WalletEntry): OrderPayment {
  return {
    id: e.id,
    type: e.type,
    status: e.status,
    amount: Number(e.amount),
    method: e.method,
    reference: e.reference,
    note: e.note,
    source: e.source,
    createdAt: e.createdAt.toISOString(),
    createdByName: e.createdByName,
    reviewedByName: e.reviewedByName,
    reviewNote: e.reviewNote,
  }
}

type OrderWithItems = Order & { items: OrderItem[]; delivery?: Delivery | null; walletEntries?: WalletEntry[] }

function toPublicOrder(order: OrderWithItems): PublicOrder {
  const totals = orderMoney(order, order.walletEntries ?? [])
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
    payments: (order.walletEntries ?? [])
      .slice()
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
      .map(toOrderPayment),
  }
}

/// Refuses a pay-later order that would take the wallet past its limit, before
/// anything is created (applyPaymentMode re-checks under a lock).
export async function assertPayLaterAllowed(customerId: string | null, total: { toNumber(): number }): Promise<void> {
  if (!customerId) throw HttpError.badRequest('Pay later needs an account. Please sign in with Google.')
  const [balance, limit] = await Promise.all([balanceOf(customerId), limitOf(customerId)])
  const available = balance.add(limit.total)
  if (available.toNumber() < total.toNumber()) {
    throw new HttpError(
      400,
      `This order is more than your pay-later limit. You can pay later up to ৳${Math.max(0, Math.floor(available.toNumber()))} right now (limit ৳${limit.total.toFixed(0)}). Choose pay first or cash on delivery, or clear your wallet.`,
      { available: Math.max(0, available.toNumber()), limit: limit.total.toNumber() },
      'WALLET_LIMIT',
    )
  }
}

/// Applies the payment mode to a just-created order. If that fails (the
/// pay-later limit was raced past), the order is removed so nothing half-placed
/// remains.
export async function finalizePayment(orderId: string): Promise<void> {
  try {
    await applyPaymentMode(orderId)
  } catch (err) {
    await prisma.order.delete({ where: { id: orderId } }).catch(() => {})
    throw err
  }
}

export async function resolveAddress(
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

export function generateOrderNumber(): string {
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
/// the registered-customer, guest and admin (on-behalf) checkout flows. An admin
/// ordering for a customer has no delivery-time restrictions — no advance-order
/// cutoff and every slot open on every day — but can't pick a day that has
/// already passed.
export async function priceCheckout(
  input: {
    items: CheckoutItem[]
    fulfillmentDate: string
    timeSlot: string
    couponCode?: string
  },
  opts: { byAdmin?: boolean } = {},
) {
  const setting = await getOrderingSetting()
  const window = computeWindow(setting)

  if (opts.byAdmin) {
    if (input.fulfillmentDate < todayInZone(setting.timezone)) {
      throw HttpError.badRequest('The delivery date has already passed.')
    }
  } else if (input.fulfillmentDate < window.earliestFulfillmentDate) {
    // Enforce the advance-order cutoff rule.
    throw HttpError.badRequest(
      `Orders must be placed for ${window.earliestFulfillmentDate} or later (cutoff ${window.cutoffTime}).`,
      { earliestFulfillmentDate: window.earliestFulfillmentDate },
    )
  }

  // The chosen slot must be one that is actually open for that weekday.
  if (!opts.byAdmin && !isSlotEnabledForDate(input.fulfillmentDate, input.timeSlot)) {
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
export function itemsCreate(priced: Awaited<ReturnType<typeof priceCheckout>>['priced']) {
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
  if (input.paymentMode === 'PAY_LATER') await assertPayLaterAllowed(customerId, priced.total)

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

  await finalizePayment(order.id)
  await notifyOrderPlaced(customerId, order.orderNumber, order.id)

  return getMyOrder(customerId, order.id)
}

/// Guest checkout: places an order without an account. Contact/address come in
/// inline. A guest can pay first (shown manual-payment instructions on the
/// confirmation) or pick cash on delivery; pay later needs an account (wallet).
/// Only admins are notified — there is no customer account to notify.
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

  await finalizePayment(order.id)
  await notifyNewOrderToAdmins(order.orderNumber, order.id)

  const fresh = await prisma.order.findUniqueOrThrow({ where: { id: order.id }, include: { items: true, walletEntries: true } })
  return toPublicOrder(fresh)
}

export async function listMyOrders(
  customerId: string,
  page?: { limit: number; offset: number },
): Promise<{ items: PublicOrder[]; total: number }> {
  const where = { customerId }
  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      include: { items: true, delivery: true, walletEntries: true },
      orderBy: { createdAt: 'desc' },
      ...(page ? { take: page.limit, skip: page.offset } : {}),
    }),
    prisma.order.count({ where }),
  ])
  return { items: orders.map(toPublicOrder), total }
}

export async function getMyOrder(customerId: string, id: string): Promise<PublicOrder> {
  const order = await prisma.order.findUnique({ where: { id }, include: { items: true, delivery: true, walletEntries: true } })
  if (!order || order.customerId !== customerId) {
    throw HttpError.notFound('Order not found')
  }
  return toPublicOrder(order)
}

/// Customer cancels their own order. Allowed only while it is still PENDING
/// (not yet confirmed). Any wallet charge is reversed; money already paid stays
/// in the wallet as credit (vault R-ORD-003).
export async function cancelOrder(customerId: string, id: string): Promise<PublicOrder> {
  const order = await prisma.order.findUnique({ where: { id } })
  if (!order || order.customerId !== customerId) throw HttpError.notFound('Order not found')
  if (order.status !== 'PENDING') {
    throw HttpError.badRequest(
      'This order can no longer be cancelled. Please contact us if you still need to cancel it.',
    )
  }
  await prisma.order.update({ where: { id }, data: { status: 'CANCELLED' } })
  await reverseOrderCharge(id)
  await notifyOrderStatus(customerId, 'CANCELLED', order.orderNumber, order.id)
  await notifyOrderCancelledByCustomer(order.orderNumber, order.id)
  return getMyOrder(customerId, id)
}

/// Customer switches their own order's payment method. Only while it is still
/// PENDING; pay later is re-checked against the wallet limit.
export async function changePaymentMode(
  customerId: string,
  id: string,
  paymentMode: Order['paymentMode'],
): Promise<PublicOrder> {
  const order = await prisma.order.findUnique({ where: { id } })
  if (!order || order.customerId !== customerId) throw HttpError.notFound('Order not found')
  await changeMode(id, paymentMode)
  return getMyOrder(customerId, id)
}

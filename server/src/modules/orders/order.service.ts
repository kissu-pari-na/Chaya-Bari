import { type Delivery, type Order, type OrderItem, type Payment } from '@prisma/client'
import { prisma } from '../../lib/prisma.js'
import { HttpError } from '../../utils/httpError.js'
import type { AddressInput, CheckoutInput } from './order.schemas.js'
import { getOrderingSetting, computeWindow } from './ordering.service.js'
import { isSlotEnabledForDate } from './slots.js'
import { priceOrder } from './pricing.js'
import { findUsableCoupon } from '../coupons/coupon.service.js'
import { paymentTotals, toPublicPayment, type PublicPayment } from '../payments/payment.service.js'
import { notifyOrderPlaced } from '../notifications/notification.service.js'

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
      recipientPhone: inline.recipientPhone,
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

export async function checkout(customerId: string, input: CheckoutInput): Promise<PublicOrder> {
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

  const address = await resolveAddress(customerId, input.addressId, input.address)

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
      items: {
        create: priced.lines.map((l) => ({
          productId: l.productId,
          productName: l.productName,
          listUnitPrice: l.listUnitPrice,
          unitPrice: l.unitPrice,
          quantity: l.quantity,
          lineTotal: l.lineTotal,
        })),
      },
    },
    include: { items: true },
  })

  await notifyOrderPlaced(customerId, order.orderNumber, order.id)

  return toPublicOrder(order)
}

export async function listMyOrders(customerId: string): Promise<PublicOrder[]> {
  const orders = await prisma.order.findMany({
    where: { customerId },
    include: { items: true, delivery: true, payments: true },
    orderBy: { createdAt: 'desc' },
  })
  return orders.map(toPublicOrder)
}

export async function getMyOrder(customerId: string, id: string): Promise<PublicOrder> {
  const order = await prisma.order.findUnique({ where: { id }, include: { items: true, delivery: true, payments: true } })
  if (!order || order.customerId !== customerId) {
    throw HttpError.notFound('Order not found')
  }
  return toPublicOrder(order)
}

import { Prisma, type Order, type OrderItem } from '@prisma/client'
import { prisma } from '../../lib/prisma.js'
import { HttpError } from '../../utils/httpError.js'
import type { AddressInput, CheckoutInput } from './order.schemas.js'
import { getOrderingSetting, computeWindow } from './ordering.service.js'

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
  notes: string | null
  subtotal: number
  customerDeliveryCost: number
  total: number
  status: Order['status']
  paymentStatus: Order['paymentStatus']
  createdAt: string
  items: PublicOrderItem[]
}

type OrderWithItems = Order & { items: OrderItem[] }

function toPublicOrder(order: OrderWithItems): PublicOrder {
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
    notes: order.notes,
    subtotal: Number(order.subtotal),
    customerDeliveryCost: Number(order.customerDeliveryCost),
    total: Number(order.total),
    status: order.status,
    paymentStatus: order.paymentStatus,
    createdAt: order.createdAt.toISOString(),
    items: order.items.map((i) => ({
      id: i.id,
      productId: i.productId,
      productName: i.productName,
      unitPrice: Number(i.unitPrice),
      quantity: i.quantity,
      lineTotal: Number(i.lineTotal),
    })),
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

  const address = await resolveAddress(customerId, input.addressId, input.address)

  // Load products and capture their current price + name (immutability).
  const productIds = input.items.map((i) => i.productId)
  const products = await prisma.product.findMany({ where: { id: { in: productIds } } })
  const productById = new Map(products.map((p) => [p.id, p]))

  let subtotal = new Prisma.Decimal(0)
  const itemsData = input.items.map((item) => {
    const product = productById.get(item.productId)
    if (!product) throw HttpError.badRequest(`Product not found: ${item.productId}`)
    if (!product.isActive || !product.isAvailable) {
      throw HttpError.badRequest(`"${product.name}" is not available for ordering`)
    }
    const unitPrice = product.price
    const lineTotal = unitPrice.mul(item.quantity)
    subtotal = subtotal.add(lineTotal)
    return {
      productId: product.id,
      productName: product.name,
      unitPrice,
      quantity: item.quantity,
      lineTotal,
    }
  })

  const deliveryCost = setting.defaultDeliveryCost
  const total = subtotal.add(deliveryCost)

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
      notes: input.notes,
      subtotal,
      customerDeliveryCost: deliveryCost,
      total,
      items: { create: itemsData },
    },
    include: { items: true },
  })

  return toPublicOrder(order)
}

export async function listMyOrders(customerId: string): Promise<PublicOrder[]> {
  const orders = await prisma.order.findMany({
    where: { customerId },
    include: { items: true },
    orderBy: { createdAt: 'desc' },
  })
  return orders.map(toPublicOrder)
}

export async function getMyOrder(customerId: string, id: string): Promise<PublicOrder> {
  const order = await prisma.order.findUnique({ where: { id }, include: { items: true } })
  if (!order || order.customerId !== customerId) {
    throw HttpError.notFound('Order not found')
  }
  return toPublicOrder(order)
}

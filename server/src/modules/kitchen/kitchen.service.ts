import type { OrderStatus } from '@prisma/client'
import { prisma } from '../../lib/prisma.js'
import { HttpError } from '../../utils/httpError.js'
import { notifyOrderStatus } from '../notifications/notification.service.js'

/// Statuses a confirmed order passes through while it is the kitchen's
/// responsibility. Once dispatched (OUT_FOR_DELIVERY) it leaves the board.
export const KITCHEN_STATUSES: OrderStatus[] = ['CONFIRMED', 'PREPARING', 'PACKED']

/// Progress order within the kitchen (for forward/backward comparisons).
const STAGE_INDEX: Record<string, number> = { CONFIRMED: 0, PREPARING: 1, PACKED: 2 }

export interface CookLine {
  productId: string | null
  productName: string
  total: number
  packed: number
  remaining: number
}

export interface KitchenOrderItem {
  productName: string
  quantity: number
}

export interface KitchenOrder {
  id: string
  orderNumber: string
  recipientName: string
  status: OrderStatus
  createdAt: string
  note: string | null
  items: KitchenOrderItem[]
}

export interface ProductionDay {
  date: string
  totals: { orders: number; toCook: number; preparing: number; packed: number; items: number }
  cook: CookLine[]
  orders: KitchenOrder[]
}

function toUtcDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d))
}

/// Upcoming fulfillment dates (today onward) that have orders still in the
/// kitchen, with counts for the day tabs.
export async function listProductionDates(): Promise<{ date: string; orderCount: number; toCook: number }[]> {
  const today = new Date()
  const todayUtc = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()))

  const orders = await prisma.order.findMany({
    where: { status: { in: KITCHEN_STATUSES }, fulfillmentDate: { gte: todayUtc } },
    select: { fulfillmentDate: true, status: true },
    orderBy: { fulfillmentDate: 'asc' },
  })

  const byDate = new Map<string, { orderCount: number; toCook: number }>()
  for (const o of orders) {
    const key = o.fulfillmentDate.toISOString().slice(0, 10)
    const entry = byDate.get(key) ?? { orderCount: 0, toCook: 0 }
    entry.orderCount += 1
    if (o.status !== 'PACKED') entry.toCook += 1
    byDate.set(key, entry)
  }
  return [...byDate.entries()].map(([date, v]) => ({ date, ...v }))
}

/// The production board for one fulfillment day: a per-item cook summary plus
/// each order as its own card, tracked independently.
export async function getProductionDay(dateStr: string): Promise<ProductionDay> {
  const date = toUtcDate(dateStr)
  const orders = await prisma.order.findMany({
    where: { fulfillmentDate: date, status: { in: KITCHEN_STATUSES } },
    include: { items: true },
    orderBy: { createdAt: 'asc' },
  })

  // Per-item cook summary. `packed` counts quantities from orders already
  // packed, so `remaining` = still to prepare — and it updates correctly when a
  // new order adds more of the same item.
  const cookByProduct = new Map<string, CookLine>()
  for (const order of orders) {
    const done = order.status === 'PACKED'
    for (const item of order.items) {
      const key = item.productId ?? `name:${item.productName}`
      const line = cookByProduct.get(key) ?? {
        productId: item.productId,
        productName: item.productName,
        total: 0,
        packed: 0,
        remaining: 0,
      }
      line.total += item.quantity
      if (done) line.packed += item.quantity
      cookByProduct.set(key, line)
    }
  }
  const cook = [...cookByProduct.values()]
    .map((l) => ({ ...l, remaining: l.total - l.packed }))
    .sort((a, b) => b.remaining - a.remaining || b.total - a.total)

  const kitchenOrders: KitchenOrder[] = orders
    .map((o) => ({
      id: o.id,
      orderNumber: o.orderNumber,
      recipientName: o.recipientName,
      status: o.status,
      createdAt: o.createdAt.toISOString(),
      note: o.notes,
      items: o.items.map((i) => ({ productName: i.productName, quantity: i.quantity })),
    }))
    .sort((a, b) => STAGE_INDEX[a.status] - STAGE_INDEX[b.status] || a.createdAt.localeCompare(b.createdAt))

  const totals = {
    orders: orders.length,
    toCook: orders.filter((o) => o.status === 'CONFIRMED').length,
    preparing: orders.filter((o) => o.status === 'PREPARING').length,
    packed: orders.filter((o) => o.status === 'PACKED').length,
    items: cook.reduce((s, l) => s + l.total, 0),
  }

  return { date: dateStr, totals, cook, orders: kitchenOrders }
}

/// Advances (or corrects) one order's kitchen stage. Only orders currently in
/// the kitchen can be moved, and only among the kitchen stages.
export async function setOrderStage(orderId: string, target: OrderStatus): Promise<KitchenOrder> {
  if (!KITCHEN_STATUSES.includes(target)) {
    throw HttpError.badRequest('Invalid kitchen stage')
  }
  const order = await prisma.order.findUnique({ where: { id: orderId }, include: { items: true } })
  if (!order) throw HttpError.notFound('Order not found')
  if (!KITCHEN_STATUSES.includes(order.status)) {
    throw HttpError.badRequest(`Order is not in the kitchen (status: ${order.status})`)
  }

  if (order.status !== target) {
    await prisma.order.update({ where: { id: orderId }, data: { status: target } })
    // Notify the customer only on forward progress (not on corrections back).
    if (STAGE_INDEX[target] > STAGE_INDEX[order.status]) {
      await notifyOrderStatus(order.customerId, target, order.orderNumber, order.id)
    }
  }

  return {
    id: order.id,
    orderNumber: order.orderNumber,
    recipientName: order.recipientName,
    status: target,
    createdAt: order.createdAt.toISOString(),
    note: order.notes,
    items: order.items.map((i) => ({ productName: i.productName, quantity: i.quantity })),
  }
}

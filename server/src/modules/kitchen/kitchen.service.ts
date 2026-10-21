import type { KitchenLineStage, OrderStatus } from '@prisma/client'
import { prisma } from '../../lib/prisma.js'
import { HttpError } from '../../utils/httpError.js'
import { notifyOrderStatus } from '../notifications/notification.service.js'

/// Orders that are the kitchen's responsibility. With the five-step flow
/// (vault D-ORD-003) that is CONFIRMED (not started) and PREPARING (cooking or
/// packed); "packed & ready to dispatch" is Order.readyAt, not a status.
export const KITCHEN_STATUSES: OrderStatus[] = ['CONFIRMED', 'PREPARING']

export const STAGES: KitchenLineStage[] = ['TO_COOK', 'PREPARING', 'READY']
const STAGE_IDX: Record<KitchenLineStage, number> = { TO_COOK: 0, PREPARING: 1, READY: 2 }
const ORDER_IDX: Record<string, number> = { CONFIRMED: 0, PREPARING: 1 }

/// Derives an order's status from its line stages: nothing started yet →
/// CONFIRMED; any progress (including all cooked) → PREPARING.
function deriveStatus(stages: KitchenLineStage[]): OrderStatus {
  if (stages.every((s) => s === 'TO_COOK')) return 'CONFIRMED'
  return 'PREPARING'
}

const allReady = (stages: KitchenLineStage[]) => stages.length > 0 && stages.every((s) => s === 'READY')

// ---- Payload types ----

export interface StageLineRef {
  lineId: string
  orderId: string
  orderNumber: string
  recipientName: string
  quantity: number
}

export interface ProductControl {
  productId: string | null
  productName: string
  stages: Record<KitchenLineStage, { qty: number; lines: StageLineRef[] }>
}

export interface OrderLine {
  id: string
  productName: string
  quantity: number
  stage: KitchenLineStage
}

export interface KitchenOrder {
  id: string
  orderNumber: string
  recipientName: string
  status: OrderStatus
  /// Packed and ready to dispatch (Order.readyAt set).
  packed: boolean
  timeSlot: string | null
  createdAt: string
  note: string | null
  lines: OrderLine[]
}

export interface ProductionDay {
  date: string
  totals: { orders: number; items: number; toCook: number; preparing: number; ready: number }
  products: ProductControl[]
  orders: KitchenOrder[]
}

function toUtcDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d))
}

// ---- Order status sync ----

/// Recomputes an order's status from its line stages; updates and (on forward
/// progress only) notifies the customer. If a line is sent back from READY, a
/// packed order un-packs automatically.
async function syncOrderStatus(orderId: string): Promise<void> {
  const order = await prisma.order.findUnique({ where: { id: orderId }, include: { items: true } })
  if (!order || !KITCHEN_STATUSES.includes(order.status)) return
  const stages = order.items.map((i) => i.kitchenStage)
  const next = deriveStatus(stages)
  const unpack = order.readyAt != null && !allReady(stages)
  if (next === order.status && !unpack) return
  await prisma.order.update({
    where: { id: orderId },
    data: { status: next, ...(unpack ? { readyAt: null } : {}) },
  })
  if (ORDER_IDX[next] > ORDER_IDX[order.status]) {
    await notifyOrderStatus(order.customerId, next, order.orderNumber, order.id)
  }
}

/// Explicitly pack (or un-pack) a ready order — a separate step from cooking.
export async function packOrder(orderId: string, packed: boolean): Promise<ProductionDay> {
  const order = await prisma.order.findUnique({ where: { id: orderId }, include: { items: true } })
  if (!order) throw HttpError.notFound('Order not found')
  if (!KITCHEN_STATUSES.includes(order.status)) {
    throw HttpError.badRequest(`Order is not in the kitchen (status: ${order.status})`)
  }
  if (packed) {
    if (!allReady(order.items.map((i) => i.kitchenStage))) throw HttpError.badRequest('All items must be ready before packing')
    if (!order.readyAt) await prisma.order.update({ where: { id: orderId }, data: { readyAt: new Date() } })
  } else if (order.readyAt) {
    // Un-pack: a silent correction (the customer still sees "Preparing").
    await prisma.order.update({ where: { id: orderId }, data: { readyAt: null } })
  }
  return getProductionDay(order.fulfillmentDate.toISOString().slice(0, 10))
}

// ---- Reads ----

export async function listProductionDates(): Promise<{ date: string; orderCount: number; toCook: number }[]> {
  const today = new Date()
  const todayUtc = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()))
  const orders = await prisma.order.findMany({
    where: { status: { in: KITCHEN_STATUSES }, fulfillmentDate: { gte: todayUtc } },
    select: { fulfillmentDate: true, readyAt: true },
    orderBy: { fulfillmentDate: 'asc' },
  })
  const byDate = new Map<string, { orderCount: number; toCook: number }>()
  for (const o of orders) {
    const key = o.fulfillmentDate.toISOString().slice(0, 10)
    const e = byDate.get(key) ?? { orderCount: 0, toCook: 0 }
    e.orderCount += 1
    if (!o.readyAt) e.toCook += 1
    byDate.set(key, e)
  }
  return [...byDate.entries()].map(([date, v]) => ({ date, ...v }))
}

export async function getProductionDay(dateStr: string): Promise<ProductionDay> {
  const date = toUtcDate(dateStr)
  const orders = await prisma.order.findMany({
    where: { fulfillmentDate: date, status: { in: KITCHEN_STATUSES } },
    include: { items: true },
    orderBy: { createdAt: 'asc' },
  })

  // Per-product control: for each stage, total qty + the individual lines
  // (which order they belong to) so the UI can bulk-move or pick an order.
  const productMap = new Map<string, ProductControl>()
  const emptyStages = (): ProductControl['stages'] => ({
    TO_COOK: { qty: 0, lines: [] },
    PREPARING: { qty: 0, lines: [] },
    READY: { qty: 0, lines: [] },
  })

  for (const o of orders) {
    for (const it of o.items) {
      const key = it.productId ?? `name:${it.productName}`
      const pc = productMap.get(key) ?? { productId: it.productId, productName: it.productName, stages: emptyStages() }
      pc.stages[it.kitchenStage].qty += it.quantity
      pc.stages[it.kitchenStage].lines.push({
        lineId: it.id,
        orderId: o.id,
        orderNumber: o.orderNumber,
        recipientName: o.recipientName,
        quantity: it.quantity,
      })
      productMap.set(key, pc)
    }
  }
  const products = [...productMap.values()].sort(
    (a, b) => b.stages.TO_COOK.qty + b.stages.PREPARING.qty - (a.stages.TO_COOK.qty + a.stages.PREPARING.qty),
  )

  // Sort the day's orders by their delivery time slot so the kitchen works them
  // in delivery order. Slot values are zero-padded ("08:00-10:00") so a plain
  // string compare is chronological; orders without a slot sort last, and
  // createdAt breaks ties.
  const slotKey = (s: string | null) => s ?? '~'
  const kitchenOrders: KitchenOrder[] = orders
    .map((o) => ({
      id: o.id,
      orderNumber: o.orderNumber,
      recipientName: o.recipientName,
      status: o.status,
      packed: o.readyAt != null,
      timeSlot: o.timeSlot,
      createdAt: o.createdAt.toISOString(),
      note: o.notes,
      lines: o.items.map((i) => ({ id: i.id, productName: i.productName, quantity: i.quantity, stage: i.kitchenStage })),
    }))
    .sort(
      (a, b) => slotKey(a.timeSlot).localeCompare(slotKey(b.timeSlot)) || a.createdAt.localeCompare(b.createdAt),
    )

  let toCook = 0
  let preparing = 0
  let ready = 0
  let items = 0
  for (const o of orders)
    for (const it of o.items) {
      items += it.quantity
      if (it.kitchenStage === 'TO_COOK') toCook += 1
      else if (it.kitchenStage === 'PREPARING') preparing += 1
      else ready += 1
    }

  return {
    date: dateStr,
    totals: { orders: orders.length, items, toCook, preparing, ready },
    products,
    orders: kitchenOrders,
  }
}

// ---- Writes ----

function assertAdjacent(from: KitchenLineStage, to: KitchenLineStage) {
  if (Math.abs(STAGE_IDX[to] - STAGE_IDX[from]) !== 1) {
    throw HttpError.badRequest('Stage can only move one step at a time')
  }
}

/// Move a single order line to an adjacent stage, then re-derive its order.
export async function moveLine(lineId: string, target: KitchenLineStage): Promise<ProductionDay> {
  if (!STAGES.includes(target)) throw HttpError.badRequest('Invalid stage')
  const line = await prisma.orderItem.findUnique({ where: { id: lineId }, include: { order: true } })
  if (!line) throw HttpError.notFound('Order line not found')
  if (!KITCHEN_STATUSES.includes(line.order.status)) {
    throw HttpError.badRequest(`Order is not in the kitchen (status: ${line.order.status})`)
  }
  assertAdjacent(line.kitchenStage, target)
  await prisma.orderItem.update({ where: { id: lineId }, data: { kitchenStage: target } })
  await syncOrderStatus(line.orderId)
  return getProductionDay(line.order.fulfillmentDate.toISOString().slice(0, 10))
}

/// Move ALL lines of one product (on a day) from one stage to an adjacent one.
export async function bulkMoveProduct(
  dateStr: string,
  productId: string | null,
  from: KitchenLineStage,
  to: KitchenLineStage,
): Promise<ProductionDay> {
  if (!STAGES.includes(from) || !STAGES.includes(to)) throw HttpError.badRequest('Invalid stage')
  assertAdjacent(from, to)
  const date = toUtcDate(dateStr)

  const lines = await prisma.orderItem.findMany({
    where: {
      kitchenStage: from,
      productId: productId ?? undefined,
      order: { fulfillmentDate: date, status: { in: KITCHEN_STATUSES } },
    },
    select: { id: true, orderId: true },
  })
  if (lines.length > 0) {
    await prisma.orderItem.updateMany({ where: { id: { in: lines.map((l) => l.id) } }, data: { kitchenStage: to } })
    const orderIds = [...new Set(lines.map((l) => l.orderId))]
    for (const id of orderIds) await syncOrderStatus(id)
  }
  return getProductionDay(dateStr)
}

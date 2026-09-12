import type { KitchenStatus, OrderStatus } from '@prisma/client'
import { prisma } from '../../lib/prisma.js'
import type { UpdateKitchenStatusInput } from './kitchen.schemas.js'

// Orders counted toward production: confirmed by the admin and not cancelled.
const PRODUCTION_STATUSES: OrderStatus[] = ['CONFIRMED', 'PREPARING', 'PACKED', 'OUT_FOR_DELIVERY']

export interface ProductionItem {
  productId: string | null
  productName: string
  quantity: number
  orderCount: number
  status: KitchenStatus
}

export interface ProductionNote {
  orderNumber: string
  recipientName: string
  note: string
}

export interface ProductionDay {
  date: string
  totalOrders: number
  totalItems: number
  items: ProductionItem[]
  notes: ProductionNote[]
}

function toUtcDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d))
}

/// Distinct upcoming fulfillment dates (today onward) that have confirmed
/// orders, so the kitchen can pick a production day.
export async function listProductionDates(): Promise<{ date: string; orderCount: number }[]> {
  const today = new Date()
  const todayUtc = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()))

  const orders = await prisma.order.groupBy({
    by: ['fulfillmentDate'],
    where: { status: { in: PRODUCTION_STATUSES }, fulfillmentDate: { gte: todayUtc } },
    _count: { _all: true },
    orderBy: { fulfillmentDate: 'asc' },
  })

  return orders.map((o) => ({
    date: o.fulfillmentDate.toISOString().slice(0, 10),
    orderCount: o._count._all,
  }))
}

/// Aggregated production requirement for one fulfillment day.
export async function getProductionDay(dateStr: string): Promise<ProductionDay> {
  const date = toUtcDate(dateStr)

  const orders = await prisma.order.findMany({
    where: { fulfillmentDate: date, status: { in: PRODUCTION_STATUSES } },
    include: { items: true },
  })

  // Aggregate quantity + distinct order count per product.
  const byProduct = new Map<
    string,
    { productId: string | null; productName: string; quantity: number; orders: Set<string> }
  >()
  for (const order of orders) {
    for (const item of order.items) {
      const key = item.productId ?? `name:${item.productName}`
      const entry = byProduct.get(key) ?? {
        productId: item.productId,
        productName: item.productName,
        quantity: 0,
        orders: new Set<string>(),
      }
      entry.quantity += item.quantity
      entry.orders.add(order.id)
      byProduct.set(key, entry)
    }
  }

  // Existing kitchen statuses for this day.
  const tasks = await prisma.kitchenTask.findMany({ where: { fulfillmentDate: date } })
  const statusByProduct = new Map(tasks.map((t) => [t.productId ?? `name:${t.productName}`, t.status]))

  const items: ProductionItem[] = [...byProduct.entries()]
    .map(([key, v]) => ({
      productId: v.productId,
      productName: v.productName,
      quantity: v.quantity,
      orderCount: v.orders.size,
      status: statusByProduct.get(key) ?? ('PENDING' as KitchenStatus),
    }))
    .sort((a, b) => b.quantity - a.quantity)

  const notes: ProductionNote[] = orders
    .filter((o) => o.notes && o.notes.trim())
    .map((o) => ({ orderNumber: o.orderNumber, recipientName: o.recipientName, note: o.notes! }))

  return {
    date: dateStr,
    totalOrders: orders.length,
    totalItems: items.reduce((sum, i) => sum + i.quantity, 0),
    items,
    notes,
  }
}

/// Upserts the kitchen status for one product on one day.
export async function updateStatus(input: UpdateKitchenStatusInput): Promise<ProductionItem> {
  const date = toUtcDate(input.date)
  const product = await prisma.product.findUnique({ where: { id: input.productId } })
  const productName = product?.name ?? 'Unknown'

  await prisma.kitchenTask.upsert({
    where: { fulfillmentDate_productId: { fulfillmentDate: date, productId: input.productId } },
    update: { status: input.status },
    create: { fulfillmentDate: date, productId: input.productId, productName, status: input.status },
  })

  // Return the refreshed production line for this product.
  const day = await getProductionDay(input.date)
  const item = day.items.find((i) => i.productId === input.productId)
  return (
    item ?? {
      productId: input.productId,
      productName,
      quantity: 0,
      orderCount: 0,
      status: input.status,
    }
  )
}

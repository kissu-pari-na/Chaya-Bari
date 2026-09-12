import { Prisma, type OrderStatus } from '@prisma/client'
import { prisma } from '../../lib/prisma.js'
import { HttpError } from '../../utils/httpError.js'
import { getProductCostMap } from '../inventory/recipe.service.js'
import { totalExpenses } from '../expenses/expense.service.js'

function toUtcDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d))
}

const round2 = (n: number) => Math.round(n * 100) / 100

// Orders counted as sales in the profit reports: everything except cancelled.
const SALES_STATUSES: OrderStatus[] = ['PENDING', 'CONFIRMED', 'PREPARING', 'PACKED', 'OUT_FOR_DELIVERY', 'DELIVERED']

// ---- Order contribution (Section 13) ----

export interface OrderContribution {
  netFoodSales: number
  productCost: number
  productGrossProfit: number
  customerDeliveryCost: number
  actualDeliveryCost: number | null
  deliveryDiscount: number
  paymentFee: number
  contribution: number | null
  complete: boolean
}

export async function orderContribution(orderId: string): Promise<OrderContribution> {
  const order = await prisma.order.findUnique({ where: { id: orderId }, include: { items: true, delivery: true } })
  if (!order) throw HttpError.notFound('Order not found')

  const costMap = await getProductCostMap()
  const netFoodSales = Number(order.subtotal) - Number(order.productDiscount)
  const productCost = order.items.reduce(
    (sum, i) => sum + (i.productId ? (costMap.get(i.productId) ?? 0) : 0) * i.quantity,
    0,
  )
  const productGrossProfit = netFoodSales - productCost

  const customerDeliveryCost = Number(order.customerDeliveryCost)
  const deliveryDiscount = Number(order.deliveryDiscount)
  const netDeliveryCharged = customerDeliveryCost - deliveryDiscount
  const actual = order.delivery?.actualDeliveryCost != null ? Number(order.delivery.actualDeliveryCost) : null
  const paymentFee = 0

  const complete = actual != null
  const contribution = complete ? productGrossProfit + netDeliveryCharged - actual - paymentFee : null

  return {
    netFoodSales: round2(netFoodSales),
    productCost: round2(productCost),
    productGrossProfit: round2(productGrossProfit),
    customerDeliveryCost: round2(customerDeliveryCost),
    actualDeliveryCost: actual != null ? round2(actual) : null,
    deliveryDiscount: round2(deliveryDiscount),
    paymentFee,
    contribution: contribution != null ? round2(contribution) : null,
    complete,
  }
}

// ---- Business profit dashboard (Section 15) + product profitability (Section 12) ----

const salesWhere = (from: string, to: string): Prisma.OrderWhereInput => ({
  status: { in: SALES_STATUSES },
  fulfillmentDate: { gte: toUtcDate(from), lte: toUtcDate(to) },
})

export interface ProductProfitRow {
  productId: string | null
  productName: string
  unitsSold: number
  revenue: number
  productDiscount: number
  netRevenue: number
  productCost: number
  grossProfit: number
  marginPct: number | null
}

export async function productProfitability(from: string, to: string): Promise<ProductProfitRow[]> {
  const orders = await prisma.order.findMany({ where: salesWhere(from, to), include: { items: true } })
  const costMap = await getProductCostMap()

  const byProduct = new Map<
    string,
    { productId: string | null; name: string; units: number; revenue: number; discount: number; net: number }
  >()
  for (const order of orders) {
    for (const i of order.items) {
      const key = i.productId ?? `name:${i.productName}`
      const entry = byProduct.get(key) ?? {
        productId: i.productId,
        name: i.productName,
        units: 0,
        revenue: 0,
        discount: 0,
        net: 0,
      }
      const gross = Number(i.listUnitPrice) * i.quantity
      const net = Number(i.lineTotal)
      entry.units += i.quantity
      entry.revenue += gross
      entry.discount += gross - net
      entry.net += net
      byProduct.set(key, entry)
    }
  }

  return [...byProduct.values()]
    .map((e) => {
      const productCost = (e.productId ? (costMap.get(e.productId) ?? 0) : 0) * e.units
      const grossProfit = e.net - productCost
      return {
        productId: e.productId,
        productName: e.name,
        unitsSold: e.units,
        revenue: round2(e.revenue),
        productDiscount: round2(e.discount),
        netRevenue: round2(e.net),
        productCost: round2(productCost),
        grossProfit: round2(grossProfit),
        marginPct: e.net > 0 ? round2((grossProfit / e.net) * 100) : null,
      }
    })
    .sort((a, b) => b.unitsSold - a.unitsSold)
}

export interface BusinessSummary {
  from: string
  to: string
  totalOrders: number
  foodSales: number
  foodDiscounts: number
  netFoodSales: number
  productCost: number
  grossProfit: number
  deliveryCollected: number
  actualDeliveryCost: number
  deliveryGainLoss: number
  ordersMissingActualDelivery: number
  otherExpenses: number
  netProfit: number
  topSelling: { productName: string; unitsSold: number }[]
  mostProfitable: { productName: string; grossProfit: number }[]
  topCustomers: { name: string; spent: number; orders: number }[]
  pendingOrders: number
  ordersAwaitingDelivery: number
  lowStockMaterials: { name: string; unit: string; stockQty: number }[]
}

export async function businessSummary(from: string, to: string): Promise<BusinessSummary> {
  const orders = await prisma.order.findMany({
    where: salesWhere(from, to),
    include: { items: true, delivery: true, customer: { include: { user: true } } },
  })
  const costMap = await getProductCostMap()

  let foodSales = 0
  let foodDiscounts = 0
  let productCost = 0
  let deliveryCollected = 0
  let actualDeliveryCost = 0
  let deliveryGainLoss = 0
  let ordersMissingActualDelivery = 0
  const customerSpend = new Map<string, { name: string; spent: number; orders: number }>()

  for (const order of orders) {
    foodSales += Number(order.subtotal)
    foodDiscounts += Number(order.productDiscount)
    for (const i of order.items) {
      productCost += (i.productId ? (costMap.get(i.productId) ?? 0) : 0) * i.quantity
    }
    const netDelivery = Number(order.customerDeliveryCost) - Number(order.deliveryDiscount)
    deliveryCollected += netDelivery
    if (order.delivery?.actualDeliveryCost != null) {
      const actual = Number(order.delivery.actualDeliveryCost)
      actualDeliveryCost += actual
      deliveryGainLoss += netDelivery - actual
    } else {
      ordersMissingActualDelivery += 1
    }
    const cust = customerSpend.get(order.customerId) ?? { name: order.customer.user.name, spent: 0, orders: 0 }
    cust.spent += Number(order.total)
    cust.orders += 1
    customerSpend.set(order.customerId, cust)
  }

  const netFoodSales = foodSales - foodDiscounts
  const grossProfit = netFoodSales - productCost
  const otherExpenses = await totalExpenses(from, to)
  const netProfit = grossProfit + deliveryGainLoss - otherExpenses

  const profitRows = await productProfitability(from, to)
  const topSelling = profitRows.slice(0, 5).map((r) => ({ productName: r.productName, unitsSold: r.unitsSold }))
  const mostProfitable = [...profitRows]
    .sort((a, b) => b.grossProfit - a.grossProfit)
    .slice(0, 5)
    .map((r) => ({ productName: r.productName, grossProfit: r.grossProfit }))
  const topCustomers = [...customerSpend.values()]
    .sort((a, b) => b.spent - a.spent)
    .slice(0, 5)
    .map((c) => ({ name: c.name, spent: round2(c.spent), orders: c.orders }))

  const [pendingOrders, awaitingDelivery, lowStock] = await Promise.all([
    prisma.order.count({ where: { status: 'PENDING' } }),
    prisma.order.count({ where: { status: { in: ['CONFIRMED', 'PREPARING', 'PACKED', 'OUT_FOR_DELIVERY'] } } }),
    prisma.material.findMany({ orderBy: { stockQty: 'asc' }, take: 5 }),
  ])

  return {
    from,
    to,
    totalOrders: orders.length,
    foodSales: round2(foodSales),
    foodDiscounts: round2(foodDiscounts),
    netFoodSales: round2(netFoodSales),
    productCost: round2(productCost),
    grossProfit: round2(grossProfit),
    deliveryCollected: round2(deliveryCollected),
    actualDeliveryCost: round2(actualDeliveryCost),
    deliveryGainLoss: round2(deliveryGainLoss),
    ordersMissingActualDelivery,
    otherExpenses: round2(otherExpenses),
    netProfit: round2(netProfit),
    topSelling,
    mostProfitable,
    topCustomers,
    pendingOrders,
    ordersAwaitingDelivery: awaitingDelivery,
    lowStockMaterials: lowStock.map((m) => ({ name: m.name, unit: m.unit, stockQty: Number(m.stockQty) })),
  }
}

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

// -----------------------------------------------------------------------------
// Phase 10 — Analytics
// -----------------------------------------------------------------------------

function median(nums: number[]): number {
  if (nums.length === 0) return 0
  const sorted = [...nums].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

// ---- Customer analytics (Section 16) ----

export interface CustomerAnalyticsRow {
  customerId: string
  name: string
  email: string
  totalOrders: number
  totalSpent: number
  avgOrderValue: number
  totalQuantity: number
  discountsReceived: number
  lastOrderDate: string
  topProducts: { name: string; quantity: number }[]
  approxProfit: number
}

export async function customerAnalytics(from: string, to: string): Promise<CustomerAnalyticsRow[]> {
  const orders = await prisma.order.findMany({
    where: salesWhere(from, to),
    include: { items: true, delivery: true, customer: { include: { user: true } } },
  })
  const costMap = await getProductCostMap()

  interface Agg {
    name: string
    email: string
    orders: number
    spent: number
    qty: number
    discounts: number
    lastOrder: Date
    products: Map<string, number>
    profit: number
  }
  const byCustomer = new Map<string, Agg>()

  for (const o of orders) {
    const agg = byCustomer.get(o.customerId) ?? {
      name: o.customer.user.name,
      email: o.customer.user.email,
      orders: 0,
      spent: 0,
      qty: 0,
      discounts: 0,
      lastOrder: o.createdAt,
      products: new Map<string, number>(),
      profit: 0,
    }
    agg.orders += 1
    agg.spent += Number(o.total)
    agg.discounts += Number(o.productDiscount) + Number(o.deliveryDiscount)
    if (o.createdAt > agg.lastOrder) agg.lastOrder = o.createdAt

    let productCost = 0
    for (const i of o.items) {
      agg.qty += i.quantity
      agg.products.set(i.productName, (agg.products.get(i.productName) ?? 0) + i.quantity)
      productCost += (i.productId ? (costMap.get(i.productId) ?? 0) : 0) * i.quantity
    }
    const netFood = Number(o.subtotal) - Number(o.productDiscount)
    const netDelivery = Number(o.customerDeliveryCost) - Number(o.deliveryDiscount)
    const actual = o.delivery?.actualDeliveryCost != null ? Number(o.delivery.actualDeliveryCost) : null
    agg.profit += netFood - productCost + (actual != null ? netDelivery - actual : 0)
    byCustomer.set(o.customerId, agg)
  }

  return [...byCustomer.entries()]
    .map(([customerId, a]) => ({
      customerId,
      name: a.name,
      email: a.email,
      totalOrders: a.orders,
      totalSpent: round2(a.spent),
      avgOrderValue: round2(a.orders > 0 ? a.spent / a.orders : 0),
      totalQuantity: a.qty,
      discountsReceived: round2(a.discounts),
      lastOrderDate: a.lastOrder.toISOString().slice(0, 10),
      topProducts: [...a.products.entries()]
        .sort((x, y) => y[1] - x[1])
        .slice(0, 3)
        .map(([name, quantity]) => ({ name, quantity })),
      approxProfit: round2(a.profit),
    }))
    .sort((a, b) => b.totalSpent - a.totalSpent)
}

// ---- Product demand + profit classification (Section 17) ----

export type ProductQuadrant = 'BEST' | 'OPTIMIZE' | 'MARKETING' | 'REVIEW'

export interface DemandProfitRow {
  productId: string | null
  productName: string
  unitsSold: number
  revenue: number
  grossProfit: number
  marginPct: number | null
  highDemand: boolean
  highProfit: boolean
  quadrant: ProductQuadrant
}

/// Classifies each product into a demand×profit quadrant relative to the median
/// units sold (demand) and median gross profit (profit) across the period.
export async function demandProfitAnalysis(from: string, to: string): Promise<DemandProfitRow[]> {
  const rows = await productProfitability(from, to)
  const demandThreshold = median(rows.map((r) => r.unitsSold))
  const profitThreshold = median(rows.map((r) => r.grossProfit))

  const quadrantFor = (highDemand: boolean, highProfit: boolean): ProductQuadrant => {
    if (highDemand && highProfit) return 'BEST'
    if (highDemand && !highProfit) return 'OPTIMIZE'
    if (!highDemand && highProfit) return 'MARKETING'
    return 'REVIEW'
  }

  return rows.map((r) => {
    const highDemand = r.unitsSold >= demandThreshold
    const highProfit = r.grossProfit >= profitThreshold
    return {
      productId: r.productId,
      productName: r.productName,
      unitsSold: r.unitsSold,
      revenue: r.revenue,
      grossProfit: r.grossProfit,
      marginPct: r.marginPct,
      highDemand,
      highProfit,
      quadrant: quadrantFor(highDemand, highProfit),
    }
  })
}

// ---- Sales by day (Section 22 sales report) ----

export interface SalesByDayRow {
  date: string
  orders: number
  foodSales: number
  discounts: number
  netSales: number
  deliveryCollected: number
}

export async function salesByDay(from: string, to: string): Promise<SalesByDayRow[]> {
  const orders = await prisma.order.findMany({ where: salesWhere(from, to) })
  const byDay = new Map<string, SalesByDayRow>()
  for (const o of orders) {
    const date = o.fulfillmentDate.toISOString().slice(0, 10)
    const row = byDay.get(date) ?? { date, orders: 0, foodSales: 0, discounts: 0, netSales: 0, deliveryCollected: 0 }
    row.orders += 1
    row.foodSales += Number(o.subtotal)
    row.discounts += Number(o.productDiscount)
    row.netSales += Number(o.subtotal) - Number(o.productDiscount)
    row.deliveryCollected += Number(o.customerDeliveryCost) - Number(o.deliveryDiscount)
    byDay.set(date, row)
  }
  return [...byDay.values()]
    .map((r) => ({
      ...r,
      foodSales: round2(r.foodSales),
      discounts: round2(r.discounts),
      netSales: round2(r.netSales),
      deliveryCollected: round2(r.deliveryCollected),
    }))
    .sort((a, b) => a.date.localeCompare(b.date))
}

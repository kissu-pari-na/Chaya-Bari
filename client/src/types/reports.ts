export interface ExpenseCategory {
  id: string
  name: string
}

export interface Expense {
  id: string
  categoryId: string
  categoryName: string
  amount: number
  spentAt: string
  description: string
  note: string | null
}

export interface ExpenseInput {
  categoryId: string
  amount: number
  spentAt: string
  description: string
  note?: string
}

export interface ExpenseSummary {
  total: number
  byCategory: { categoryId: string; categoryName: string; total: number }[]
}

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

// Phase 10 — analytics

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

export interface SalesByDayRow {
  date: string
  orders: number
  foodSales: number
  discounts: number
  netSales: number
  deliveryCollected: number
}

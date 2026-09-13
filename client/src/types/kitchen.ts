/// Stages the kitchen moves an order through (a subset of the order status).
export type KitchenStage = 'CONFIRMED' | 'PREPARING' | 'PACKED'

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
  status: KitchenStage
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

export interface ProductionDate {
  date: string
  orderCount: number
  toCook: number
}

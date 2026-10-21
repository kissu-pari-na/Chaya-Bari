export type KitchenStage = 'TO_COOK' | 'PREPARING' | 'READY'
/// An order's status while it is with the kitchen (five-step flow).
export type OrderKitchenStatus = 'CONFIRMED' | 'PREPARING'
/// What the kitchen card shows: derived from the lines and the packed flag.
export type KitchenCardState = 'CONFIRMED' | 'PREPARING' | 'READY' | 'PACKED'

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
  stages: Record<KitchenStage, { qty: number; lines: StageLineRef[] }>
}

export interface OrderLine {
  id: string
  productName: string
  quantity: number
  stage: KitchenStage
}

export interface KitchenOrder {
  id: string
  orderNumber: string
  recipientName: string
  status: OrderKitchenStatus
  /// Packed and ready to dispatch (Order.readyAt).
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

export interface ProductionDate {
  date: string
  orderCount: number
  toCook: number
}

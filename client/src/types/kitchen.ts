export type KitchenStage = 'TO_COOK' | 'PREPARING' | 'READY'
export type OrderKitchenStatus = 'CONFIRMED' | 'PREPARING' | 'READY' | 'PACKED'

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

export type KitchenStatus = 'PENDING' | 'PREPARING' | 'PREPARED' | 'PACKED'

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

export interface ProductionDate {
  date: string
  orderCount: number
}

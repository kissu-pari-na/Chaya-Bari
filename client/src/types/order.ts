export type OrderStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'PREPARING'
  | 'PACKED'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'CANCELLED'

export type PaymentStatus = 'PENDING' | 'PAID' | 'PARTIALLY_PAID' | 'REFUNDED' | 'FAILED'

export interface Address {
  id: string
  label: string | null
  recipientName: string
  recipientPhone: string
  addressLine: string
  area: string | null
  city: string
  note: string | null
  isDefault: boolean
}

export interface AddressInput {
  label?: string
  recipientName: string
  recipientPhone: string
  addressLine: string
  area?: string
  city: string
  note?: string
  isDefault?: boolean
}

export interface OrderItem {
  id: string
  productId: string | null
  productName: string
  unitPrice: number
  quantity: number
  lineTotal: number
}

export interface Order {
  id: string
  orderNumber: string
  recipientName: string
  recipientPhone: string
  addressLine: string
  area: string | null
  city: string
  addressNote: string | null
  fulfillmentDate: string
  notes: string | null
  subtotal: number
  customerDeliveryCost: number
  total: number
  status: OrderStatus
  paymentStatus: PaymentStatus
  createdAt: string
  items: OrderItem[]
}

export interface OrderingWindow {
  cutoffTime: string
  timezone: string
  minAdvanceDays: number
  defaultDeliveryCost: number
  earliestFulfillmentDate: string
  pastCutoffForToday: boolean
}

export interface CheckoutInput {
  items: { productId: string; quantity: number }[]
  addressId?: string
  address?: AddressInput
  fulfillmentDate: string
  notes?: string
}

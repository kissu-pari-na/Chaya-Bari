import type { DeliverySummary } from './delivery'
import type { Payment } from './payment'

export type OrderStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'PREPARING'
  | 'READY'
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
  listUnitPrice: number
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
  timeSlot: string | null
  notes: string | null
  subtotal: number
  productDiscount: number
  customerDeliveryCost: number
  deliveryDiscount: number
  total: number
  couponCode: string | null
  status: OrderStatus
  paymentStatus: PaymentStatus
  amountPaid: number
  amountDue: number
  createdAt: string
  items: OrderItem[]
  delivery: DeliverySummary | null
  payments: Payment[]
}

export interface AdminOrder extends Order {
  customer: {
    id: string
    name: string
    email: string
    phone: string | null
  }
}

export type CouponScope = 'FOOD' | 'DELIVERY'
export type CouponKind = 'PERCENT' | 'FIXED' | 'FREE_DELIVERY'

export interface Coupon {
  id: string
  code: string
  description: string | null
  scope: CouponScope
  kind: CouponKind
  value: number
  minOrderSubtotal: number
  isActive: boolean
  expiresAt: string | null
}

export interface CouponInput {
  code: string
  description?: string
  scope: CouponScope
  kind: CouponKind
  value?: number
  minOrderSubtotal?: number
  isActive?: boolean
  expiresAt?: string
}

export interface CouponPreview {
  coupon: Coupon
  pricing: {
    subtotal: number
    productDiscount: number
    netFood: number
    customerDeliveryCost: number
    deliveryDiscount: number
    total: number
  }
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
  timeSlot: string
  notes?: string
  couponCode?: string
}

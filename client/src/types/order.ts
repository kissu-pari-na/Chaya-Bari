import type { DeliverySummary } from './delivery'
import type { OrderPayment } from './payment'

/// The five steps everyone sees (+ cancelled). "Packed & ready" is readyAt.
export type OrderStatus = 'PENDING' | 'CONFIRMED' | 'PREPARING' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'CANCELLED'

export type PaymentStatus = 'PENDING' | 'PAID' | 'PARTIALLY_PAID' | 'REFUNDED' | 'FAILED' | 'ON_WALLET'

/// Pay first (manual payment or wallet credit), pay later (charged to the
/// wallet within its limit) or cash on delivery.
export type PaymentMode = 'PAY_FIRST' | 'PAY_LATER' | 'COD'

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
  paymentMode: PaymentMode
  amountPaid: number
  amountDue: number
  /// Part of the order charged to the wallet (pay later, or cash collected short).
  onWallet: number
  createdAt: string
  /// Kitchen packed it; ready to dispatch (status stays PREPARING).
  readyAt: string | null
  dispatchedAt: string | null
  deliveredAt: string | null
  items: OrderItem[]
  delivery: DeliverySummary | null
  payments: OrderPayment[]
}

export interface AdminOrder extends Order {
  customer: {
    /// Null for a guest order (no account).
    id: string | null
    name: string
    email: string | null
    phone: string | null
    isGuest: boolean
    /// An account an admin opened for this email that its owner hasn't claimed
    /// (registered / confirmed) yet.
    isPlaceholder: boolean
  }
  /// The admin who placed this order on the customer's behalf, if any.
  placedBy: { id: string; name: string } | null
  /// Public tracking link (no login needed); set once the order is confirmed.
  trackingUrl: string | null
  /// When the "order confirmed" email with that link was sent.
  confirmationEmailSentAt: string | null
}

/// Public view of an order opened from its emailed tracking link (no login).
/// Street address and phone are deliberately left out.
export interface TrackedOrder {
  orderNumber: string
  status: OrderStatus
  paymentStatus: PaymentStatus
  paymentMode: PaymentMode
  fulfillmentDate: string
  timeSlot: string | null
  recipientName: string
  area: string | null
  city: string
  items: { productName: string; quantity: number; unitPrice: number; lineTotal: number }[]
  subtotal: number
  productDiscount: number
  customerDeliveryCost: number
  deliveryDiscount: number
  total: number
  amountPaid: number
  amountDue: number
  onWallet: number
  createdAt: string
  readyAt: string | null
  dispatchedAt: string | null
  deliveredAt: string | null
  delivery: DeliverySummary | null
  account: { maskedEmail: string | null; registered: boolean }
}

/// Who an email belongs to, for the admin's "order on behalf" form.
export interface CustomerLookup {
  email: string
  exists: boolean
  isStaff: boolean
  isPlaceholder: boolean
  isRegistered: boolean
  name: string | null
  phone: string | null
  addresses: Address[]
  orderCount: number
}

/// Admin places an order on a customer's behalf, identified by email.
export interface AdminCheckoutInput {
  customer: { email: string; name: string }
  items: { productId: string; quantity: number }[]
  addressId?: string
  address?: AddressInput
  saveAddress?: boolean
  fulfillmentDate: string
  timeSlot: string
  notes?: string
  couponCode?: string
  paymentMode?: PaymentMode
}

/// WALLET_LIMIT codes raise a customer's pay-later limit (redeemed in the wallet).
export type CouponScope = 'FOOD' | 'DELIVERY' | 'WALLET_LIMIT'
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
  limitDays: number | null
  maxRedemptions: number | null
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
  limitDays?: number
  maxRedemptions?: number
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
  paymentMode?: PaymentMode
}

/// Guest checkout (no account). Contact + address are inline and required;
/// guests can pay first or cash on delivery (no wallet, so no pay later).
export interface GuestCheckoutInput {
  items: { productId: string; quantity: number }[]
  address: AddressInput
  guestEmail?: string
  fulfillmentDate: string
  timeSlot: string
  notes?: string
  couponCode?: string
  paymentMode?: PaymentMode
}

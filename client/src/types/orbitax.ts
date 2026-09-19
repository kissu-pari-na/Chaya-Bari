import type { OrderStatus, PaymentMode, PaymentStatus } from './order'
import type { Payment, PaymentMethod } from './payment'

/// Methods an Orbitax user can pick when settling their combined balance.
export type OrbitaxPayMethod = Extract<PaymentMethod, 'CASH' | 'BKASH' | 'NAGAD' | 'ROCKET' | 'BANK' | 'ONLINE'>

/// One outstanding order shown on the Orbitax billing page.
export interface OrbitaxOrderSummary {
  id: string
  orderNumber: string
  fulfillmentDate: string
  createdAt: string
  status: OrderStatus
  paymentStatus: PaymentStatus
  paymentMode: PaymentMode
  total: number
  amountPaid: number
  amountDue: number
}

/// The signed-in Orbitax user's combined billing summary.
export interface OrbitaxAccount {
  isOrbitax: boolean
  name: string
  email: string
  totalDue: number
  totalPaid: number
  outstandingOrders: number
  orders: OrbitaxOrderSummary[]
}

export interface OrbitaxPayInput {
  method: OrbitaxPayMethod
  amount: number
  reference?: string
  note?: string
}

export interface OrbitaxPayResult {
  claims: Payment[]
  account: OrbitaxAccount
}

export type PaymentMethod = 'CASH' | 'BKASH' | 'NAGAD' | 'ROCKET' | 'CARD' | 'BANK' | 'ONLINE'
export type PaymentTxnStatus = 'PENDING' | 'SUCCESS' | 'FAILED' | 'REFUNDED' | 'VOID'
export type PaymentSource = 'ADMIN' | 'CUSTOMER'

export interface Payment {
  id: string
  orderId: string
  method: PaymentMethod
  amount: number
  status: PaymentTxnStatus
  source: PaymentSource
  reference: string | null
  note: string | null
  createdAt: string
  /// Audit trail.
  recordedByName: string | null
  voidedByName: string | null
  voidedAt: string | null
  voidReason: string | null
}

export interface RecordPaymentInput {
  method: PaymentMethod
  amount: number
  status?: PaymentTxnStatus
  reference?: string
  note?: string
}

/// A customer's manual payment claim (cash / transfer), pending admin review.
export interface ClaimPaymentInput {
  method: PaymentMethod
  amount: number
  reference?: string
  note?: string
}

export interface BkashStart {
  paymentID: string
  bkashURL: string
  mock: boolean
  mode: 'live' | 'sandbox'
}

/// Public payment-account details customers send manual payments to.
export interface PaymentInfo {
  bkash: string | null
  nagad: string | null
  rocket: string | null
  bankInfo: string | null
}

// Wallet & payment types (vault node: wallet). Money lives in one signed ledger
// per customer: + credits (money in), − debits (money owed).

export type PaymentMethod = 'CASH' | 'BKASH' | 'NAGAD' | 'ROCKET' | 'CARD' | 'BANK' | 'ONLINE'
export type PaymentSource = 'ADMIN' | 'CUSTOMER' | 'SYSTEM'
export type WalletEntryType = 'ORDER_CHARGE' | 'ORDER_REFUND' | 'PAYMENT' | 'ADJUSTMENT'
export type WalletEntryStatus = 'PENDING' | 'CONFIRMED' | 'REJECTED'

/// A wallet entry as shown on an order.
export interface OrderPayment {
  id: string
  type: WalletEntryType
  status: WalletEntryStatus
  /// Signed: + money in, − charged.
  amount: number
  method: PaymentMethod | null
  reference: string | null
  note: string | null
  source: PaymentSource
  createdAt: string
  createdByName: string | null
  reviewedByName: string | null
  reviewNote: string | null
}

/// A wallet timeline entry.
export interface WalletEntry extends OrderPayment {
  orderId: string | null
  orderNumber: string | null
  reviewedAt: string | null
  /// Balance right after this entry (confirmed entries only).
  balanceAfter: number | null
}

export interface LimitGrant {
  id: string
  code: string
  amount: number
  expiresAt: string
  createdAt: string
  active: boolean
}

export interface WalletSummary {
  customerId: string
  balance: number
  owed: number
  credit: number
  baseLimit: number
  limit: number
  /// How much a pay-later order may cost right now.
  available: number
  pendingClaims: { count: number; amount: number }
  grants: LimitGrant[]
}

export interface ClaimInput {
  amount: number
  method: PaymentMethod
  reference: string
  note?: string
  orderId?: string
}

/// Admin adjustment: signed amount, reference required.
export interface AdjustInput {
  amount: number
  reference: string
  note?: string
  method?: PaymentMethod
}

export interface RecordPaymentInput {
  amount: number
  method: PaymentMethod
  reference: string
  note?: string
}

export interface PendingClaim extends WalletEntry {
  customer: { id: string | null; name: string; email: string | null; phone: string | null }
}

export interface WalletRow {
  customerId: string
  name: string
  email: string
  phone: string | null
  balance: number
  limit: number
  pendingClaims: number
  lastActivity: string | null
}

export interface WalletTotals {
  owed: number
  credit: number
  pendingClaims: number
  pendingAmount: number
}

/// Public payment-account details customers send manual payments to.
export interface PaymentInfo {
  bkash: string | null
  nagad: string | null
  rocket: string | null
  bankInfo: string | null
}

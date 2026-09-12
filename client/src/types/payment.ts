export type PaymentMethod = 'CASH' | 'BKASH' | 'CARD' | 'ONLINE' | 'COD'
export type PaymentTxnStatus = 'PENDING' | 'SUCCESS' | 'FAILED' | 'REFUNDED'

export interface Payment {
  id: string
  orderId: string
  method: PaymentMethod
  amount: number
  status: PaymentTxnStatus
  reference: string | null
  note: string | null
  createdAt: string
}

export interface RecordPaymentInput {
  method: PaymentMethod
  amount: number
  status?: PaymentTxnStatus
  reference?: string
  note?: string
}

import type { PaymentMethod, PaymentTxnStatus } from '../types/payment'

export const paymentMethodLabel: Record<PaymentMethod, string> = {
  CASH: 'ক্যাশ',
  BKASH: 'বিকাশ',
  CARD: 'কার্ড',
  ONLINE: 'অনলাইন',
  COD: 'ক্যাশ অন ডেলিভারি',
}

export const paymentMethods: PaymentMethod[] = ['CASH', 'BKASH', 'CARD', 'ONLINE', 'COD']

export const txnStatusLabel: Record<PaymentTxnStatus, string> = {
  PENDING: 'অপেক্ষমাণ',
  SUCCESS: 'সফল',
  FAILED: 'ব্যর্থ',
  REFUNDED: 'ফেরত',
}

export const txnStatuses: PaymentTxnStatus[] = ['SUCCESS', 'PENDING', 'FAILED', 'REFUNDED']

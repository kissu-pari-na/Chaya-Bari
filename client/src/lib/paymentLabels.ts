import type { PaymentMethod, PaymentSource, PaymentTxnStatus } from '../types/payment'

export const paymentMethodLabel: Record<PaymentMethod, string> = {
  CASH: 'ক্যাশ',
  BKASH: 'বিকাশ',
  NAGAD: 'নগদ',
  ROCKET: 'রকেট',
  CARD: 'কার্ড',
  BANK: 'ব্যাংক ট্রান্সফার',
  ONLINE: 'অনলাইন',
}

/// All methods (admin manual entry).
export const paymentMethods: PaymentMethod[] = ['CASH', 'BKASH', 'NAGAD', 'ROCKET', 'CARD', 'BANK', 'ONLINE']

/// Methods a customer can pick when reporting a payment they already made.
export const claimMethods: PaymentMethod[] = ['CASH', 'BKASH', 'NAGAD', 'ROCKET', 'BANK', 'ONLINE']

export const txnStatusLabel: Record<PaymentTxnStatus, string> = {
  PENDING: 'যাচাইয়ের অপেক্ষায়',
  SUCCESS: 'নিশ্চিত',
  FAILED: 'বাতিল',
  REFUNDED: 'ফেরত',
}

export const txnStatuses: PaymentTxnStatus[] = ['SUCCESS', 'PENDING', 'FAILED', 'REFUNDED']

export const paymentSourceLabel: Record<PaymentSource, string> = {
  ADMIN: 'অ্যাডমিন',
  CUSTOMER: 'গ্রাহক',
}

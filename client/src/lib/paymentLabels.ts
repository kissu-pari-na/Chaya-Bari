import type { PaymentMethod, PaymentSource, PaymentTxnStatus } from '../types/payment'
import { pick } from './i18n'

// Getter-based maps so labels render in the active language at access time.
export const paymentMethodLabel: Record<PaymentMethod, string> = {
  get CASH() {
    return pick('ক্যাশ', 'Cash')
  },
  get BKASH() {
    return pick('বিকাশ', 'bKash')
  },
  get NAGAD() {
    return pick('নগদ', 'Nagad')
  },
  get ROCKET() {
    return pick('রকেট', 'Rocket')
  },
  get CARD() {
    return pick('কার্ড', 'Card')
  },
  get BANK() {
    return pick('ব্যাংক ট্রান্সফার', 'Bank transfer')
  },
  get ONLINE() {
    return pick('অনলাইন', 'Online')
  },
}

/// All methods (admin manual entry).
export const paymentMethods: PaymentMethod[] = ['CASH', 'BKASH', 'NAGAD', 'ROCKET', 'CARD', 'BANK', 'ONLINE']

/// Methods a customer can pick when reporting a payment they already made.
export const claimMethods: PaymentMethod[] = ['CASH', 'BKASH', 'NAGAD', 'ROCKET', 'BANK', 'ONLINE']

export const txnStatusLabel: Record<PaymentTxnStatus, string> = {
  get PENDING() {
    return pick('যাচাইয়ের অপেক্ষায়', 'Awaiting verification')
  },
  get SUCCESS() {
    return pick('নিশ্চিত', 'Confirmed')
  },
  get FAILED() {
    return pick('বাতিল', 'Failed')
  },
  get REFUNDED() {
    return pick('ফেরত', 'Refunded')
  },
  get VOID() {
    return pick('বাতিল (রেকর্ড)', 'Voided')
  },
}

// Statuses an admin can pick when recording a payment directly. Refunds and
// voids are dedicated audited actions, not a manual "type" here.
export const txnStatuses: PaymentTxnStatus[] = ['SUCCESS', 'PENDING']

export const paymentSourceLabel: Record<PaymentSource, string> = {
  get ADMIN() {
    return pick('অ্যাডমিন', 'Admin')
  },
  get CUSTOMER() {
    return pick('গ্রাহক', 'Customer')
  },
}

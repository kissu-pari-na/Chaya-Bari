import type { PaymentMethod, PaymentSource, WalletEntryStatus, WalletEntryType } from '../types/payment'
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

/// Methods an admin can record.
export const paymentMethods: PaymentMethod[] = ['CASH', 'BKASH', 'NAGAD', 'ROCKET', 'BANK', 'CARD']

/// Methods a customer can pay us by manually (no online gateway).
export const claimMethods: PaymentMethod[] = ['BKASH', 'NAGAD', 'ROCKET', 'BANK', 'CASH']

export const entryTypeLabel: Record<WalletEntryType, string> = {
  get ORDER_CHARGE() {
    return pick('অর্ডার', 'Order')
  },
  get ORDER_REFUND() {
    return pick('অর্ডার বাতিল (ফেরত)', 'Order cancelled (reversed)')
  },
  get PAYMENT() {
    return pick('পেমেন্ট', 'Payment')
  },
  get ADJUSTMENT() {
    return pick('সমন্বয়', 'Adjustment')
  },
}

export const entryStatusLabel: Record<WalletEntryStatus, string> = {
  get PENDING() {
    return pick('যাচাইয়ের অপেক্ষায়', 'Awaiting review')
  },
  get CONFIRMED() {
    return pick('নিশ্চিত', 'Confirmed')
  },
  get REJECTED() {
    return pick('বাতিল', 'Rejected')
  },
}

export const paymentSourceLabel: Record<PaymentSource, string> = {
  get ADMIN() {
    return pick('অ্যাডমিন', 'Admin')
  },
  get CUSTOMER() {
    return pick('গ্রাহক', 'Customer')
  },
  get SYSTEM() {
    return pick('স্বয়ংক্রিয়', 'Automatic')
  },
}

/// Icon for a timeline entry (paired with its text label, never alone).
export const entryIcon: Record<WalletEntryType, string> = {
  ORDER_CHARGE: '🧾',
  ORDER_REFUND: '↺',
  PAYMENT: '৳',
  ADJUSTMENT: '⚖',
}

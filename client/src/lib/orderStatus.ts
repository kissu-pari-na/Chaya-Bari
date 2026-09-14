import type { OrderStatus, PaymentStatus } from '../types/order'
import { pick } from './i18n'

// Getter-based maps so `label[status]` renders in the active language at
// access time. Consumers re-render on a language change (the provider re-runs
// the tree), so the getters re-evaluate with the new language.
export const orderStatusLabel: Record<OrderStatus, string> = {
  get PENDING() {
    return pick('অপেক্ষমাণ', 'Pending')
  },
  get CONFIRMED() {
    return pick('নিশ্চিত', 'Confirmed')
  },
  get PREPARING() {
    return pick('তৈরি হচ্ছে', 'Preparing')
  },
  get READY() {
    return pick('প্রস্তুত', 'Ready')
  },
  get PACKED() {
    return pick('প্যাকড', 'Packed')
  },
  get OUT_FOR_DELIVERY() {
    return pick('ডেলিভারিতে', 'Out for delivery')
  },
  get DELIVERED() {
    return pick('ডেলিভার্ড', 'Delivered')
  },
  get CANCELLED() {
    return pick('বাতিল', 'Cancelled')
  },
}

export const paymentStatusLabel: Record<PaymentStatus, string> = {
  get PENDING() {
    return pick('অপেক্ষমাণ', 'Pending')
  },
  get PAID() {
    return pick('পরিশোধিত', 'Paid')
  },
  get PARTIALLY_PAID() {
    return pick('আংশিক', 'Partial')
  },
  get REFUNDED() {
    return pick('ফেরত', 'Refunded')
  },
  get FAILED() {
    return pick('ব্যর্থ', 'Failed')
  },
}

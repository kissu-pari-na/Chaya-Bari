import type { OrderStatus, PaymentMode, PaymentStatus } from '../types/order'
import { pick } from './i18n'

// Getter-based maps so `label[status]` renders in the active language at
// access time. Consumers re-render on a language change (the provider re-runs
// the tree), so the getters re-evaluate with the new language.
export const orderStatusLabel: Record<OrderStatus, string> = {
  get PENDING() {
    return pick('অর্ডার গৃহীত', 'Placed')
  },
  get CONFIRMED() {
    return pick('নিশ্চিত', 'Confirmed')
  },
  get PREPARING() {
    return pick('তৈরি হচ্ছে', 'Preparing')
  },
  get OUT_FOR_DELIVERY() {
    return pick('পথে আছে', 'On the way')
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
    return pick('বাকি', 'Unpaid')
  },
  get PAID() {
    return pick('পরিশোধিত', 'Paid')
  },
  get PARTIALLY_PAID() {
    return pick('আংশিক', 'Partly paid')
  },
  get REFUNDED() {
    return pick('ফেরত', 'Reversed')
  },
  get FAILED() {
    return pick('ব্যর্থ', 'Failed')
  },
  get ON_WALLET() {
    return pick('ওয়ালেটে', 'On wallet')
  },
}

export const paymentModeLabel: Record<PaymentMode, string> = {
  get PAY_FIRST() {
    return pick('আগে পেমেন্ট', 'Pay first')
  },
  get PAY_LATER() {
    return pick('পরে পেমেন্ট', 'Pay later')
  },
  get COD() {
    return pick('ক্যাশ অন ডেলিভারি', 'Cash on delivery')
  },
}

/// Status pill class (semantic colour + icon, see Orders.css).
export const paymentStatusClass: Record<PaymentStatus, string> = {
  PENDING: 'status status--pending',
  PAID: 'status status--delivered',
  PARTIALLY_PAID: 'status status--pending',
  REFUNDED: 'status status--payment',
  FAILED: 'status status--cancelled',
  ON_WALLET: 'status status--payment',
}

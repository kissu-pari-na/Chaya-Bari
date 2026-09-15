import type { OrderStatus, PaymentStatus } from '../types/order'
import { pick } from './i18n'

export interface TrackStep {
  key: string
  icon: string
  label: string
  description: string
  /// Whether this milestone has been reached for the given order state.
  reached: (status: OrderStatus, paymentStatus: PaymentStatus) => boolean
}

// Rank of each fulfillment status, used to decide which milestones are reached.
const statusRank: Record<Exclude<OrderStatus, 'CANCELLED'>, number> = {
  PENDING: 0,
  CONFIRMED: 1,
  PREPARING: 2,
  READY: 3,
  PACKED: 4,
  OUT_FOR_DELIVERY: 5,
  DELIVERED: 6,
}

function rankReached(status: OrderStatus, min: Exclude<OrderStatus, 'CANCELLED'>): boolean {
  if (status === 'CANCELLED') return false
  return statusRank[status] >= statusRank[min]
}

/// The customer-facing milestones an order moves through, in order. A dedicated
/// "Payment completed" step sits before "Confirmed" and is driven by the
/// payment status, so the tracker stays in sync with what has actually been
/// paid (a paid order advances; a payment that is removed/refunded moves it
/// back). CANCELLED is handled separately by the tracker. `label`/`description`
/// are getters so they render in the active language.
export const trackSteps: TrackStep[] = [
  {
    key: 'PLACED',
    icon: '📝',
    get label() { return pick('অর্ডার গৃহীত', 'Order received') },
    get description() { return pick('আপনার অর্ডার আমরা পেয়েছি', 'We have received your order') },
    reached: () => true,
  },
  {
    key: 'PAID',
    icon: '💳',
    get label() { return pick('পেমেন্ট সম্পন্ন', 'Payment completed') },
    get description() { return pick('সম্পূর্ণ পেমেন্ট পাওয়া গেছে', 'Full payment received') },
    reached: (_status, paymentStatus) => paymentStatus === 'PAID',
  },
  {
    key: 'CONFIRMED',
    icon: '✅',
    get label() { return pick('নিশ্চিত', 'Confirmed') },
    get description() { return pick('অর্ডার নিশ্চিত করা হয়েছে', 'Your order has been confirmed') },
    reached: (status) => rankReached(status, 'CONFIRMED'),
  },
  {
    key: 'PREPARING',
    icon: '👨‍🍳',
    get label() { return pick('তৈরি হচ্ছে', 'Preparing') },
    get description() { return pick('রান্নাঘরে তৈরি হচ্ছে', 'Being prepared in the kitchen') },
    reached: (status) => rankReached(status, 'PREPARING'),
  },
  {
    key: 'READY',
    icon: '🍱',
    get label() { return pick('প্রস্তুত', 'Ready') },
    get description() { return pick('অর্ডার প্রস্তুত', 'Your order is ready') },
    reached: (status) => rankReached(status, 'READY'),
  },
  {
    key: 'PACKED',
    icon: '📦',
    get label() { return pick('প্যাকড', 'Packed') },
    get description() { return pick('প্যাক করা হয়েছে', 'Packed and ready to go') },
    reached: (status) => rankReached(status, 'PACKED'),
  },
  {
    key: 'OUT_FOR_DELIVERY',
    icon: '🛵',
    get label() { return pick('ডেলিভারিতে', 'Out for delivery') },
    get description() { return pick('পথে রয়েছে', 'On the way to you') },
    reached: (status) => rankReached(status, 'OUT_FOR_DELIVERY'),
  },
  {
    key: 'DELIVERED',
    icon: '🎉',
    get label() { return pick('ডেলিভার্ড', 'Delivered') },
    get description() { return pick('পৌঁছে দেওয়া হয়েছে', 'Delivered to you') },
    reached: (status) => rankReached(status, 'DELIVERED'),
  },
]

export type TrackState = 'done' | 'current' | 'upcoming'

export interface TrackStepView extends TrackStep {
  state: TrackState
}

export interface OrderTrackerView {
  cancelled: boolean
  /// Index of the current step in `trackSteps`. -1 when cancelled.
  currentIndex: number
  steps: TrackStepView[]
}

/// Derives the tracker view from the order + payment status: which milestones
/// are done, which is active, and which are upcoming. A CANCELLED order returns
/// `cancelled: true` so the tracker can render its terminal state instead.
export function orderTrackerView(
  status: OrderStatus,
  paymentStatus: PaymentStatus,
): OrderTrackerView {
  if (status === 'CANCELLED') {
    return {
      cancelled: true,
      currentIndex: -1,
      steps: trackSteps.map((step) => ({ ...step, state: 'upcoming' as TrackState })),
    }
  }

  const reached = trackSteps.map((step) => step.reached(status, paymentStatus))
  // The current step is the first not-yet-reached milestone (where the order is
  // waiting); everything before it is done. If all are reached, the last is the
  // current (delivered) step.
  let currentIndex = reached.findIndex((r) => !r)
  if (currentIndex === -1) currentIndex = trackSteps.length - 1

  return {
    cancelled: false,
    currentIndex,
    steps: trackSteps.map((step, index) => ({
      ...step,
      state: index < currentIndex ? 'done' : index === currentIndex ? 'current' : 'upcoming',
    })),
  }
}

import type { OrderStatus, PaymentMode, PaymentStatus } from '../types/order'
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

// Individual milestones. They are composed into per-payment-mode timelines
// below, so the same step definitions drive both the prepaid and the
// cash-on-delivery flows. `label`/`description` are getters so they render in
// the active language.

const stepPlaced: TrackStep = {
  key: 'PLACED',
  icon: '📝',
  get label() { return pick('অর্ডার গৃহীত', 'Order received') },
  get description() { return pick('আপনার অর্ডার আমরা পেয়েছি', 'We have received your order') },
  reached: () => true,
}

/// Prepaid-only milestone: full payment received before the order is confirmed.
/// Worded so it reads correctly both while pending (shown in the status banner)
/// and once paid (a done checkmark on the timeline).
const stepPaidPrepaid: TrackStep = {
  key: 'PAID',
  icon: '💳',
  get label() { return pick('পেমেন্ট', 'Payment') },
  get description() { return pick('সম্পূর্ণ পেমেন্ট পেলে অর্ডার নিশ্চিত হবে', 'Order is confirmed once full payment is received') },
  reached: (_status, paymentStatus) => paymentStatus === 'PAID',
}

const stepConfirmed: TrackStep = {
  key: 'CONFIRMED',
  icon: '✅',
  get label() { return pick('নিশ্চিত', 'Confirmed') },
  get description() { return pick('অর্ডার নিশ্চিত করা হয়েছে', 'Your order has been confirmed') },
  reached: (status) => rankReached(status, 'CONFIRMED'),
}

const stepPreparing: TrackStep = {
  key: 'PREPARING',
  icon: '👨‍🍳',
  get label() { return pick('তৈরি হচ্ছে', 'Preparing') },
  get description() { return pick('রান্নাঘরে তৈরি হচ্ছে', 'Being prepared in the kitchen') },
  reached: (status) => rankReached(status, 'PREPARING'),
}

const stepReady: TrackStep = {
  key: 'READY',
  icon: '🍱',
  get label() { return pick('প্রস্তুত', 'Ready') },
  get description() { return pick('অর্ডার প্রস্তুত', 'Your order is ready') },
  reached: (status) => rankReached(status, 'READY'),
}

const stepPacked: TrackStep = {
  key: 'PACKED',
  icon: '📦',
  get label() { return pick('প্যাকড', 'Packed') },
  get description() { return pick('প্যাক করা হয়েছে', 'Packed and ready to go') },
  reached: (status) => rankReached(status, 'PACKED'),
}

/// Out-for-delivery. For COD the courier collects the cash here, so the copy
/// nudges the customer to keep the amount ready.
const stepOutForDelivery = (mode: PaymentMode): TrackStep => ({
  key: 'OUT_FOR_DELIVERY',
  icon: '🛵',
  get label() { return pick('ডেলিভারিতে', 'Out for delivery') },
  get description() {
    return mode === 'COD'
      ? pick('পথে রয়েছে — নগদ প্রস্তুত রাখুন', 'On the way — keep the cash ready')
      : pick('পথে রয়েছে', 'On the way to you')
  },
  reached: (status) => rankReached(status, 'OUT_FOR_DELIVERY'),
})

const stepDelivered: TrackStep = {
  key: 'DELIVERED',
  icon: '🎉',
  get label() { return pick('ডেলিভার্ড', 'Delivered') },
  get description() { return pick('পৌঁছে দেওয়া হয়েছে', 'Delivered to you') },
  reached: (status) => rankReached(status, 'DELIVERED'),
}

/// COD-only closing milestone: the cash is collected on delivery, so payment is
/// tracked at the end of the flow (reached once the balance is settled).
const stepPaidCod: TrackStep = {
  key: 'PAID',
  icon: '💵',
  get label() { return pick('নগদ পেমেন্ট', 'Cash payment') },
  get description() { return pick('ডেলিভারিতে নগদে সংগ্রহ করা হবে', 'Collected in cash at your door') },
  reached: (_status, paymentStatus) => paymentStatus === 'PAID',
}

/// The prepaid timeline: payment is a gate before confirmation.
export const trackSteps: TrackStep[] = [
  stepPlaced,
  stepPaidPrepaid,
  stepConfirmed,
  stepPreparing,
  stepReady,
  stepPacked,
  stepOutForDelivery('PREPAID'),
  stepDelivered,
]

/// The cash-on-delivery timeline: no upfront payment gate; the cash payment is
/// the closing milestone after delivery.
export const codTrackSteps: TrackStep[] = [
  stepPlaced,
  stepConfirmed,
  stepPreparing,
  stepReady,
  stepPacked,
  stepOutForDelivery('COD'),
  stepDelivered,
  stepPaidCod,
]

/// The milestone timeline for an order's payment mode.
export function stepsForMode(mode: PaymentMode): TrackStep[] {
  return mode === 'COD' ? codTrackSteps : trackSteps
}

export type TrackState = 'done' | 'current' | 'upcoming'

export interface TrackStepView extends TrackStep {
  state: TrackState
}

export interface OrderTrackerView {
  cancelled: boolean
  /// Index of the current step in the mode's timeline. -1 when cancelled.
  currentIndex: number
  steps: TrackStepView[]
}

/// Derives the tracker view from the order + payment status and the order's
/// payment mode: which milestones are done, which is active, and which are
/// upcoming. Prepaid orders gate on payment before confirmation; cash-on-
/// delivery orders track the cash payment as the closing milestone instead. A
/// CANCELLED order returns `cancelled: true` so the tracker can render its
/// terminal state instead.
export function orderTrackerView(
  status: OrderStatus,
  paymentStatus: PaymentStatus,
  paymentMode: PaymentMode = 'PREPAID',
): OrderTrackerView {
  const steps = stepsForMode(paymentMode)

  if (status === 'CANCELLED') {
    return {
      cancelled: true,
      currentIndex: -1,
      steps: steps.map((step) => ({ ...step, state: 'upcoming' as TrackState })),
    }
  }

  const reached = steps.map((step) => step.reached(status, paymentStatus))
  // The current step is the first not-yet-reached milestone (where the order is
  // waiting); everything before it is done. If all are reached, the last is the
  // current step.
  let currentIndex = reached.findIndex((r) => !r)
  if (currentIndex === -1) currentIndex = steps.length - 1

  return {
    cancelled: false,
    currentIndex,
    steps: steps.map((step, index) => ({
      ...step,
      state: index < currentIndex ? 'done' : index === currentIndex ? 'current' : 'upcoming',
    })),
  }
}

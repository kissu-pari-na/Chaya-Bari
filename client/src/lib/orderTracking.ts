import type { OrderStatus, PaymentMode, PaymentStatus } from '../types/order'
import { pick } from './i18n'

// The customer-facing order journey: five steps, the same for every payment
// method (vault D-ORD-003). Payment shows up as a note on the current step
// ("waiting for payment", "pay ৳X on delivery"), never as an extra step.

export type StepKey = 'PLACED' | 'CONFIRMED' | 'PREPARING' | 'OUT_FOR_DELIVERY' | 'DELIVERED'

export interface TrackStep {
  key: StepKey
  icon: string
  label: string
  description: string
}

const rank: Record<Exclude<OrderStatus, 'CANCELLED'>, number> = {
  PENDING: 0,
  CONFIRMED: 1,
  PREPARING: 2,
  OUT_FOR_DELIVERY: 3,
  DELIVERED: 4,
}

export const trackSteps: TrackStep[] = [
  {
    key: 'PLACED',
    icon: '📝',
    get label() { return pick('অর্ডার গৃহীত', 'Placed') },
    get description() { return pick('আপনার অর্ডার আমরা পেয়েছি', 'We have your order') },
  },
  {
    key: 'CONFIRMED',
    icon: '✅',
    get label() { return pick('নিশ্চিত', 'Confirmed') },
    get description() { return pick('অর্ডার নিশ্চিত করা হয়েছে', 'Your order is confirmed') },
  },
  {
    key: 'PREPARING',
    icon: '👨‍🍳',
    get label() { return pick('তৈরি হচ্ছে', 'Preparing') },
    get description() { return pick('রান্নাঘরে তৈরি হচ্ছে', 'Being cooked fresh') },
  },
  {
    key: 'OUT_FOR_DELIVERY',
    icon: '🛵',
    get label() { return pick('পথে আছে', 'On the way') },
    get description() { return pick('আপনার কাছে আসছে', 'Heading to you') },
  },
  {
    key: 'DELIVERED',
    icon: '🎉',
    get label() { return pick('ডেলিভার্ড', 'Delivered') },
    get description() { return pick('পৌঁছে দেওয়া হয়েছে', 'Enjoy your meal!') },
  },
]

export type TrackState = 'done' | 'current' | 'upcoming'

export interface TrackStepView extends TrackStep {
  state: TrackState
}

export interface OrderTrackerView {
  cancelled: boolean
  /// Index of the step the order is at (0..4); -1 when cancelled.
  currentIndex: number
  steps: TrackStepView[]
  /// One plain sentence about what happens next, including any payment action.
  nextAction: string | null
}

export interface TrackInput {
  status: OrderStatus
  paymentStatus: PaymentStatus
  paymentMode: PaymentMode
  amountDue?: number
  readyAt?: string | null
  formatMoney?: (n: number) => string
}

/// What the customer should know or do next, in plain words (vault I-ORD-001).
function nextActionFor(i: TrackInput): string | null {
  const money = (n: number) => (i.formatMoney ? i.formatMoney(n) : `৳${n}`)
  switch (i.status) {
    case 'PENDING':
      if (i.paymentMode === 'PAY_FIRST' && i.paymentStatus !== 'PAID') {
        return pick(
          `${money(i.amountDue ?? 0)} পরিশোধ করে রেফারেন্স জমা দিন — যাচাইয়ের পর অর্ডার নিশ্চিত হবে।`,
          `Pay ${money(i.amountDue ?? 0)} and submit the reference — your order confirms once it's verified.`,
        )
      }
      return pick('আমরা শীঘ্রই আপনার অর্ডার নিশ্চিত করব।', "We'll confirm your order shortly.")
    case 'CONFIRMED':
      return pick('রান্না শুরু হলে জানিয়ে দেব।', "We'll let you know when cooking starts.")
    case 'PREPARING':
      return i.readyAt
        ? pick('প্যাক করা হয়েছে — শীঘ্রই রওনা হবে।', 'Packed and ready — leaving soon.')
        : pick('আপনার খাবার তৈরি হচ্ছে।', 'Your food is being cooked.')
    case 'OUT_FOR_DELIVERY':
      return i.paymentMode === 'COD'
        ? pick(`ডেলিভারির সময় ${money(i.amountDue ?? 0)} নগদ প্রস্তুত রাখুন। ফোন সচল রাখুন।`, `Keep ${money(i.amountDue ?? 0)} cash ready, and your phone on.`)
        : pick('অনুগ্রহ করে ফোন সচল রাখুন।', 'Please keep your phone on.')
    default:
      return null
  }
}

export function orderTrackerView(input: TrackInput): OrderTrackerView {
  if (input.status === 'CANCELLED') {
    return { cancelled: true, currentIndex: -1, steps: trackSteps.map((s) => ({ ...s, state: 'upcoming' })), nextAction: null }
  }
  const currentIndex = rank[input.status]
  return {
    cancelled: false,
    currentIndex,
    steps: trackSteps.map((s, idx) => ({
      ...s,
      state: idx < currentIndex || input.status === 'DELIVERED' ? 'done' : idx === currentIndex ? 'current' : 'upcoming',
    })),
    nextAction: nextActionFor(input),
  }
}

import type { OrderStatus } from '../types/order'
import { pick } from './i18n'

export interface TrackStep {
  status: OrderStatus
  icon: string
  label: string
  description: string
}

/// The customer-facing milestones an order moves through, in order. CANCELLED
/// is intentionally excluded — it is an off-path terminal state handled
/// separately by the tracker. `label`/`description` are getters so they render
/// in the active language when read (or spread) during a render.
export const trackSteps: TrackStep[] = [
  { status: 'PENDING', icon: '📝', get label() { return pick('অর্ডার গৃহীত', 'Order received') }, get description() { return pick('আপনার অর্ডার আমরা পেয়েছি', 'We have received your order') } },
  { status: 'CONFIRMED', icon: '✅', get label() { return pick('নিশ্চিত', 'Confirmed') }, get description() { return pick('অর্ডার নিশ্চিত করা হয়েছে', 'Your order has been confirmed') } },
  { status: 'PREPARING', icon: '👨‍🍳', get label() { return pick('তৈরি হচ্ছে', 'Preparing') }, get description() { return pick('রান্নাঘরে তৈরি হচ্ছে', 'Being prepared in the kitchen') } },
  { status: 'READY', icon: '🍱', get label() { return pick('প্রস্তুত', 'Ready') }, get description() { return pick('অর্ডার প্রস্তুত', 'Your order is ready') } },
  { status: 'PACKED', icon: '📦', get label() { return pick('প্যাকড', 'Packed') }, get description() { return pick('প্যাক করা হয়েছে', 'Packed and ready to go') } },
  { status: 'OUT_FOR_DELIVERY', icon: '🛵', get label() { return pick('ডেলিভারিতে', 'Out for delivery') }, get description() { return pick('পথে রয়েছে', 'On the way to you') } },
  { status: 'DELIVERED', icon: '🎉', get label() { return pick('ডেলিভার্ড', 'Delivered') }, get description() { return pick('পৌঁছে দেওয়া হয়েছে', 'Delivered to you') } },
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

/// Derives the tracker view for an order status: which milestones are done,
/// which is active, and which are still upcoming. A CANCELLED order returns
/// `cancelled: true` so the tracker can render its terminal state instead.
export function orderTrackerView(status: OrderStatus): OrderTrackerView {
  if (status === 'CANCELLED') {
    return {
      cancelled: true,
      currentIndex: -1,
      steps: trackSteps.map((step) => ({ ...step, state: 'upcoming' as TrackState })),
    }
  }

  const currentIndex = trackSteps.findIndex((step) => step.status === status)

  return {
    cancelled: false,
    currentIndex,
    steps: trackSteps.map((step, index) => ({
      ...step,
      state: index < currentIndex ? 'done' : index === currentIndex ? 'current' : 'upcoming',
    })),
  }
}

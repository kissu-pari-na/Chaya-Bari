import type { OrderStatus } from '../types/order'

export interface TrackStep {
  status: OrderStatus
  icon: string
  label: string
  description: string
}

/// The customer-facing milestones an order moves through, in order. CANCELLED
/// is intentionally excluded — it is an off-path terminal state handled
/// separately by the tracker.
export const trackSteps: TrackStep[] = [
  { status: 'PENDING', icon: '📝', label: 'অর্ডার গৃহীত', description: 'আপনার অর্ডার আমরা পেয়েছি' },
  { status: 'CONFIRMED', icon: '✅', label: 'নিশ্চিত', description: 'অর্ডার নিশ্চিত করা হয়েছে' },
  { status: 'PREPARING', icon: '👨‍🍳', label: 'তৈরি হচ্ছে', description: 'রান্নাঘরে তৈরি হচ্ছে' },
  { status: 'READY', icon: '🍱', label: 'প্রস্তুত', description: 'অর্ডার প্রস্তুত' },
  { status: 'PACKED', icon: '📦', label: 'প্যাকড', description: 'প্যাক করা হয়েছে' },
  { status: 'OUT_FOR_DELIVERY', icon: '🛵', label: 'ডেলিভারিতে', description: 'পথে রয়েছে' },
  { status: 'DELIVERED', icon: '🎉', label: 'ডেলিভার্ড', description: 'পৌঁছে দেওয়া হয়েছে' },
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

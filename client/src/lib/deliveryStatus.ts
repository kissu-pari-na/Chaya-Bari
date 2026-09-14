import type { DeliveryStatus } from '../types/delivery'
import { pick } from './i18n'

export const deliveryStatusLabel: Record<DeliveryStatus, string> = {
  get PENDING() {
    return pick('অপেক্ষমাণ', 'Pending')
  },
  get ASSIGNED() {
    return pick('অ্যাসাইনড', 'Assigned')
  },
  get PICKED_UP() {
    return pick('পিকআপ হয়েছে', 'Picked up')
  },
  get DELIVERED() {
    return pick('ডেলিভার্ড', 'Delivered')
  },
  get FAILED() {
    return pick('ব্যর্থ', 'Failed')
  },
  get CANCELLED() {
    return pick('বাতিল', 'Cancelled')
  },
}

export const deliveryStatuses: DeliveryStatus[] = [
  'PENDING',
  'ASSIGNED',
  'PICKED_UP',
  'DELIVERED',
  'FAILED',
  'CANCELLED',
]

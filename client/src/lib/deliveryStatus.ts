import type { DeliveryStatus } from '../types/delivery'

export const deliveryStatusLabel: Record<DeliveryStatus, string> = {
  PENDING: 'অপেক্ষমাণ',
  ASSIGNED: 'অ্যাসাইনড',
  PICKED_UP: 'পিকআপ হয়েছে',
  DELIVERED: 'ডেলিভার্ড',
  FAILED: 'ব্যর্থ',
  CANCELLED: 'বাতিল',
}

export const deliveryStatuses: DeliveryStatus[] = [
  'PENDING',
  'ASSIGNED',
  'PICKED_UP',
  'DELIVERED',
  'FAILED',
  'CANCELLED',
]

import type { OrderStatus, PaymentStatus } from '../types/order'

export const orderStatusLabel: Record<OrderStatus, string> = {
  PENDING: 'অপেক্ষমাণ',
  CONFIRMED: 'নিশ্চিত',
  PREPARING: 'তৈরি হচ্ছে',
  PACKED: 'প্যাকড',
  OUT_FOR_DELIVERY: 'ডেলিভারিতে',
  DELIVERED: 'ডেলিভার্ড',
  CANCELLED: 'বাতিল',
}

export const paymentStatusLabel: Record<PaymentStatus, string> = {
  PENDING: 'অপেক্ষমাণ',
  PAID: 'পরিশোধিত',
  PARTIALLY_PAID: 'আংশিক',
  REFUNDED: 'ফেরত',
  FAILED: 'ব্যর্থ',
}

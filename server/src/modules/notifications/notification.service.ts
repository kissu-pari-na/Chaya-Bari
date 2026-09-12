import type { Notification, NotificationType, OrderStatus } from '@prisma/client'
import { prisma } from '../../lib/prisma.js'
import { logger } from '../../lib/logger.js'

export interface PublicNotification {
  id: string
  type: NotificationType
  title: string
  body: string
  orderId: string | null
  read: boolean
  createdAt: string
}

function toPublic(n: Notification): PublicNotification {
  return {
    id: n.id,
    type: n.type,
    title: n.title,
    body: n.body,
    orderId: n.orderId,
    read: n.read,
    createdAt: n.createdAt.toISOString(),
  }
}

interface NotifyInput {
  userId: string
  type: NotificationType
  title: string
  body: string
  orderId?: string
}

/// Creates a notification. Never throws into the calling flow — a failed
/// notification must not break an order or payment.
export async function notify(input: NotifyInput): Promise<void> {
  try {
    await prisma.notification.create({
      data: { userId: input.userId, type: input.type, title: input.title, body: input.body, orderId: input.orderId },
    })
  } catch (err) {
    logger.error('Failed to create notification', { message: err instanceof Error ? err.message : String(err) })
  }
}

/// Notify the user who owns a customer profile.
export async function notifyCustomer(customerId: string, input: Omit<NotifyInput, 'userId'>): Promise<void> {
  const customer = await prisma.customer.findUnique({ where: { id: customerId } })
  if (customer) await notify({ ...input, userId: customer.userId })
}

/// Notify every admin user.
export async function notifyAdmins(input: Omit<NotifyInput, 'userId'>): Promise<void> {
  const admins = await prisma.user.findMany({ where: { role: 'ADMIN', isActive: true }, select: { id: true } })
  await Promise.all(admins.map((a) => notify({ ...input, userId: a.id })))
}

// ---- Event helpers ----

const statusMessage: Partial<Record<OrderStatus, { type: NotificationType; title: string; body: string }>> = {
  CONFIRMED: { type: 'ORDER_CONFIRMED', title: 'অর্ডার নিশ্চিত হয়েছে', body: 'আপনার অর্ডারটি নিশ্চিত করা হয়েছে।' },
  PREPARING: { type: 'ORDER_PREPARING', title: 'খাবার তৈরি হচ্ছে', body: 'আপনার অর্ডারের খাবার তৈরি হচ্ছে।' },
  PACKED: { type: 'ORDER_PACKED', title: 'প্যাকিং সম্পন্ন', body: 'আপনার অর্ডার প্যাক করা হয়েছে।' },
  OUT_FOR_DELIVERY: { type: 'ORDER_OUT_FOR_DELIVERY', title: 'ডেলিভারিতে', body: 'আপনার অর্ডার ডেলিভারির পথে।' },
  DELIVERED: { type: 'ORDER_DELIVERED', title: 'ডেলিভার্ড', body: 'আপনার অর্ডার ডেলিভার হয়েছে। ধন্যবাদ!' },
  CANCELLED: { type: 'ORDER_CANCELLED', title: 'অর্ডার বাতিল', body: 'আপনার অর্ডারটি বাতিল করা হয়েছে।' },
}

export async function notifyOrderPlaced(customerId: string, orderNumber: string, orderId: string): Promise<void> {
  await notifyCustomer(customerId, {
    type: 'ORDER_PLACED',
    title: 'অর্ডার গৃহীত হয়েছে',
    body: `আপনার অর্ডার ${orderNumber} গ্রহণ করা হয়েছে।`,
    orderId,
  })
  await notifyAdmins({ type: 'NEW_ORDER', title: 'নতুন অর্ডার', body: `নতুন অর্ডার ${orderNumber} এসেছে।`, orderId })
}

export async function notifyOrderStatus(customerId: string, status: OrderStatus, orderNumber: string, orderId: string): Promise<void> {
  const msg = statusMessage[status]
  if (!msg) return
  await notifyCustomer(customerId, { type: msg.type, title: msg.title, body: `${msg.body} (${orderNumber})`, orderId })
}

export async function notifyPaymentReceived(customerId: string, amount: number, orderNumber: string, orderId: string): Promise<void> {
  await notifyCustomer(customerId, {
    type: 'PAYMENT_RECEIVED',
    title: 'পেমেন্ট গৃহীত',
    body: `${orderNumber} অর্ডারের জন্য ৳${amount} পেমেন্ট গ্রহণ করা হয়েছে।`,
    orderId,
  })
  await notifyAdmins({ type: 'PAYMENT_RECEIVED', title: 'পেমেন্ট গৃহীত', body: `${orderNumber}: ৳${amount} পেমেন্ট।`, orderId })
}

// ---- Queries ----

export async function listForUser(userId: string): Promise<{ notifications: PublicNotification[]; unread: number }> {
  const [notifications, unread] = await Promise.all([
    prisma.notification.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 50 }),
    prisma.notification.count({ where: { userId, read: false } }),
  ])
  return { notifications: notifications.map(toPublic), unread }
}

export async function markRead(userId: string, id: string): Promise<void> {
  await prisma.notification.updateMany({ where: { id, userId }, data: { read: true } })
}

export async function markAllRead(userId: string): Promise<void> {
  await prisma.notification.updateMany({ where: { userId, read: false }, data: { read: true } })
}

import type { Notification, NotificationType, OrderStatus } from '@prisma/client'
import { prisma } from '../../lib/prisma.js'
import { logger } from '../../lib/logger.js'

export interface PublicNotification {
  id: string
  type: NotificationType
  title: string
  body: string
  orderId: string | null
  link: string | null
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
    link: n.link,
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
  /// In-app path to open when the notification is clicked.
  link?: string
}

/// Creates a notification. Never throws into the calling flow — a failed
/// notification must not break an order or payment.
export async function notify(input: NotifyInput): Promise<void> {
  try {
    await prisma.notification.create({
      data: {
        userId: input.userId,
        type: input.type,
        title: input.title,
        body: input.body,
        orderId: input.orderId,
        link: input.link,
      },
    })
  } catch (err) {
    logger.error('Failed to create notification', { message: err instanceof Error ? err.message : String(err) })
  }
}

/// Standard click-through paths.
const customerOrderLink = (orderId: string) => `/orders/${orderId}`
const adminOrderLink = (orderId: string) => `/admin/orders/${orderId}`
const orderReviewLink = (orderId: string) => `/orders/${orderId}/review`

/// Notify the user who owns a customer profile. A null customerId (guest order)
/// is a no-op — there is no account to notify.
export async function notifyCustomer(customerId: string | null, input: Omit<NotifyInput, 'userId'>): Promise<void> {
  if (!customerId) return
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
  READY: { type: 'ORDER_READY', title: 'খাবার প্রস্তুত', body: 'আপনার অর্ডারের খাবার তৈরি হয়ে গেছে।' },
  PACKED: { type: 'ORDER_PACKED', title: 'প্যাকিং সম্পন্ন', body: 'আপনার অর্ডার প্যাক করা হয়েছে।' },
  OUT_FOR_DELIVERY: { type: 'ORDER_OUT_FOR_DELIVERY', title: 'ডেলিভারিতে', body: 'আপনার অর্ডার ডেলিভারির পথে।' },
  DELIVERED: { type: 'ORDER_DELIVERED', title: 'ডেলিভার্ড', body: 'আপনার অর্ডার ডেলিভার হয়েছে। ধন্যবাদ!' },
  CANCELLED: { type: 'ORDER_CANCELLED', title: 'অর্ডার বাতিল', body: 'আপনার অর্ডারটি বাতিল করা হয়েছে।' },
}

/// Notify every admin that a new order arrived (used for both customer and
/// guest orders).
export async function notifyNewOrderToAdmins(orderNumber: string, orderId: string): Promise<void> {
  await notifyAdmins({
    type: 'NEW_ORDER',
    title: 'নতুন অর্ডার',
    body: `নতুন অর্ডার ${orderNumber} এসেছে।`,
    orderId,
    link: adminOrderLink(orderId),
  })
}

export async function notifyOrderPlaced(customerId: string, orderNumber: string, orderId: string): Promise<void> {
  await notifyCustomer(customerId, {
    type: 'ORDER_PLACED',
    title: 'অর্ডার গৃহীত হয়েছে',
    body: `আপনার অর্ডার ${orderNumber} গ্রহণ করা হয়েছে।`,
    orderId,
    link: customerOrderLink(orderId),
  })
  await notifyNewOrderToAdmins(orderNumber, orderId)
}

export async function notifyOrderStatus(customerId: string | null, status: OrderStatus, orderNumber: string, orderId: string): Promise<void> {
  const msg = statusMessage[status]
  if (!msg) return
  await notifyCustomer(customerId, {
    type: msg.type,
    title: msg.title,
    body: `${msg.body} (${orderNumber})`,
    orderId,
    link: customerOrderLink(orderId),
  })
}

/// Day-after-delivery invitation to review the order's products.
export async function notifyReviewInvite(customerId: string, orderNumber: string, orderId: string): Promise<void> {
  await notifyCustomer(customerId, {
    type: 'REVIEW_INVITE',
    title: 'আপনার মতামত জানান',
    body: `${orderNumber} অর্ডারের পণ্যগুলোর রিভিউ ও রেটিং দিন — আপনার মতামত আমাদের কাছে গুরুত্বপূর্ণ।`,
    orderId,
    link: orderReviewLink(orderId),
  })
}

export async function notifyPaymentReceived(customerId: string | null, amount: number, orderNumber: string, orderId: string): Promise<void> {
  await notifyCustomer(customerId, {
    type: 'PAYMENT_RECEIVED',
    title: 'পেমেন্ট গৃহীত',
    body: `${orderNumber} অর্ডারের জন্য ৳${amount} পেমেন্ট গ্রহণ করা হয়েছে।`,
    orderId,
    link: customerOrderLink(orderId),
  })
  await notifyAdmins({
    type: 'PAYMENT_RECEIVED',
    title: 'পেমেন্ট গৃহীত',
    body: `${orderNumber}: ৳${amount} পেমেন্ট।`,
    orderId,
    link: adminOrderLink(orderId),
  })
}

/// A customer submitted a manual payment claim that admins must verify.
export async function notifyPaymentSubmitted(amount: number, method: string, orderNumber: string, orderId: string): Promise<void> {
  await notifyAdmins({
    type: 'PAYMENT_SUBMITTED',
    title: 'পেমেন্ট যাচাইয়ের অপেক্ষায়',
    body: `${orderNumber}: গ্রাহক ৳${amount} (${method}) পরিশোধের দাবি করেছেন — যাচাই করুন।`,
    orderId,
    link: adminOrderLink(orderId),
  })
}

/// An admin verified or rejected a customer's manual payment claim.
export async function notifyPaymentVerified(customerId: string | null, verified: boolean, amount: number, orderNumber: string, orderId: string): Promise<void> {
  if (verified) {
    await notifyCustomer(customerId, {
      type: 'PAYMENT_VERIFIED',
      title: 'পেমেন্ট নিশ্চিত হয়েছে',
      body: `${orderNumber} অর্ডারের ৳${amount} পেমেন্ট যাচাই করে নিশ্চিত করা হয়েছে। ধন্যবাদ!`,
      orderId,
      link: customerOrderLink(orderId),
    })
  } else {
    await notifyCustomer(customerId, {
      type: 'PAYMENT_REJECTED',
      title: 'পেমেন্ট যাচাই করা যায়নি',
      body: `${orderNumber} অর্ডারের ৳${amount} পেমেন্ট যাচাই করা যায়নি। অনুগ্রহ করে সঠিক তথ্য দিয়ে আবার জানান।`,
      orderId,
      link: customerOrderLink(orderId),
    })
  }
}

// ---- Queries ----

export async function listForUser(userId: string): Promise<{ notifications: PublicNotification[]; unread: number }> {
  const [notifications, unread] = await Promise.all([
    // Panel shows only the latest few; the unread badge still counts them all.
    prisma.notification.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 7 }),
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

/// Permanently removes all of the user's notifications.
export async function clearAll(userId: string): Promise<void> {
  await prisma.notification.deleteMany({ where: { userId } })
}

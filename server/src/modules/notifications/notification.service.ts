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

/// Customer-facing message for each order status change. Each names the order,
/// says what just happened, and hints at what comes next so the customer always
/// knows where things stand. Returns null for statuses with no notification
/// (e.g. the initial PENDING).
function statusMessage(
  status: OrderStatus,
  orderNumber: string,
): { type: NotificationType; title: string; body: string } | null {
  switch (status) {
    case 'CONFIRMED':
      return {
        type: 'ORDER_CONFIRMED',
        title: 'অর্ডার নিশ্চিত হয়েছে ✅',
        body: `আপনার অর্ডার ${orderNumber} নিশ্চিত করা হয়েছে। শীঘ্রই খাবার তৈরি শুরু হবে।`,
      }
    case 'PREPARING':
      return {
        type: 'ORDER_PREPARING',
        title: 'রান্না শুরু হয়েছে 👨‍🍳',
        body: `আপনার অর্ডার ${orderNumber}-এর খাবার এখন আমাদের রান্নাঘরে তৈরি হচ্ছে।`,
      }
    case 'READY':
      return {
        type: 'ORDER_READY',
        title: 'খাবার প্রস্তুত 🍱',
        body: `আপনার অর্ডার ${orderNumber}-এর খাবার তৈরি হয়ে গেছে। এখন প্যাক করা হবে।`,
      }
    case 'PACKED':
      return {
        type: 'ORDER_PACKED',
        title: 'প্যাকিং সম্পন্ন 📦',
        body: `আপনার অর্ডার ${orderNumber} প্যাক করা হয়েছে এবং ডেলিভারির জন্য প্রস্তুত।`,
      }
    case 'OUT_FOR_DELIVERY':
      return {
        type: 'ORDER_OUT_FOR_DELIVERY',
        title: 'অর্ডার পথে রয়েছে 🛵',
        body: `আপনার অর্ডার ${orderNumber} ডেলিভারির জন্য রওনা হয়েছে। অনুগ্রহ করে ফোন সচল রাখুন।`,
      }
    case 'DELIVERED':
      return {
        type: 'ORDER_DELIVERED',
        title: 'অর্ডার ডেলিভার হয়েছে 🎉',
        body: `আপনার অর্ডার ${orderNumber} পৌঁছে দেওয়া হয়েছে। ছায়া বাড়ির সাথে থাকার জন্য ধন্যবাদ!`,
      }
    case 'CANCELLED':
      return {
        type: 'ORDER_CANCELLED',
        title: 'অর্ডার বাতিল হয়েছে',
        body: `আপনার অর্ডার ${orderNumber} বাতিল করা হয়েছে। কোনো প্রশ্ন থাকলে আমাদের সাথে যোগাযোগ করুন।`,
      }
    default:
      return null
  }
}

/// Notify every admin that a new order arrived (used for both customer and
/// guest orders).
export async function notifyNewOrderToAdmins(orderNumber: string, orderId: string): Promise<void> {
  await notifyAdmins({
    type: 'NEW_ORDER',
    title: 'নতুন অর্ডার এসেছে 🛎️',
    body: `নতুন অর্ডার ${orderNumber} এসেছে। প্রক্রিয়া শুরু করতে বিস্তারিত দেখুন।`,
    orderId,
    link: adminOrderLink(orderId),
  })
}

export async function notifyOrderPlaced(customerId: string, orderNumber: string, orderId: string): Promise<void> {
  await notifyCustomer(customerId, {
    type: 'ORDER_PLACED',
    title: 'অর্ডার পেয়েছি ✅',
    body: `ধন্যবাদ! আপনার অর্ডার ${orderNumber} সফলভাবে গ্রহণ করা হয়েছে। শীঘ্রই এটি নিশ্চিত করা হবে।`,
    orderId,
    link: customerOrderLink(orderId),
  })
  await notifyNewOrderToAdmins(orderNumber, orderId)
}

export async function notifyOrderStatus(customerId: string | null, status: OrderStatus, orderNumber: string, orderId: string): Promise<void> {
  const msg = statusMessage(status, orderNumber)
  if (!msg) return
  await notifyCustomer(customerId, {
    type: msg.type,
    title: msg.title,
    body: msg.body,
    orderId,
    link: customerOrderLink(orderId),
  })
}

/// Day-after-delivery invitation to review the order's products.
export async function notifyReviewInvite(customerId: string, orderNumber: string, orderId: string): Promise<void> {
  await notifyCustomer(customerId, {
    type: 'REVIEW_INVITE',
    title: 'আপনার মতামত জানান ⭐',
    body: `আপনার অর্ডার ${orderNumber}-এর খাবার কেমন ছিল জানান। রিভিউ ও রেটিং দিতে ট্যাপ করুন — আপনার মতামত আমাদের কাছে গুরুত্বপূর্ণ।`,
    orderId,
    link: orderReviewLink(orderId),
  })
}

export async function notifyPaymentReceived(customerId: string | null, amount: number, orderNumber: string, orderId: string): Promise<void> {
  await notifyCustomer(customerId, {
    type: 'PAYMENT_RECEIVED',
    title: 'পেমেন্ট গৃহীত হয়েছে 💳',
    body: `আপনার অর্ডার ${orderNumber}-এর জন্য ৳${amount} পেমেন্ট গ্রহণ করা হয়েছে। ধন্যবাদ!`,
    orderId,
    link: customerOrderLink(orderId),
  })
  await notifyAdmins({
    type: 'PAYMENT_RECEIVED',
    title: 'পেমেন্ট গৃহীত',
    body: `অর্ডার ${orderNumber}-এর জন্য ৳${amount} পেমেন্ট রেকর্ড হয়েছে।`,
    orderId,
    link: adminOrderLink(orderId),
  })
}

/// A customer submitted a manual payment claim that admins must verify.
export async function notifyPaymentSubmitted(amount: number, method: string, orderNumber: string, orderId: string): Promise<void> {
  await notifyAdmins({
    type: 'PAYMENT_SUBMITTED',
    title: 'পেমেন্ট যাচাই করুন',
    body: `গ্রাহক অর্ডার ${orderNumber}-এর জন্য ৳${amount} (${method}) পরিশোধের তথ্য জমা দিয়েছেন। অনুগ্রহ করে যাচাই করুন।`,
    orderId,
    link: adminOrderLink(orderId),
  })
}

/// An admin verified or rejected a customer's manual payment claim.
export async function notifyPaymentVerified(customerId: string | null, verified: boolean, amount: number, orderNumber: string, orderId: string): Promise<void> {
  if (verified) {
    await notifyCustomer(customerId, {
      type: 'PAYMENT_VERIFIED',
      title: 'পেমেন্ট নিশ্চিত হয়েছে ✅',
      body: `আপনার অর্ডার ${orderNumber}-এর ৳${amount} পেমেন্ট যাচাই করে নিশ্চিত করা হয়েছে। ধন্যবাদ!`,
      orderId,
      link: customerOrderLink(orderId),
    })
  } else {
    await notifyCustomer(customerId, {
      type: 'PAYMENT_REJECTED',
      title: 'পেমেন্ট যাচাই করা যায়নি',
      body: `আপনার অর্ডার ${orderNumber}-এর ৳${amount} পেমেন্ট যাচাই করা যায়নি। অনুগ্রহ করে সঠিক তথ্য দিয়ে আবার জমা দিন।`,
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

import { prisma } from '../../lib/prisma.js'
import { logger } from '../../lib/logger.js'
import { appLink, sendEmail } from '../../lib/mailer.js'
import { notifyReviewInvite } from '../notifications/notification.service.js'

// Asia/Dhaka is a fixed UTC+6 offset (no DST); the business operates there.
const DHAKA_OFFSET_MS = 6 * 60 * 60 * 1000

/// The UTC instant of the start of "today" in Dhaka. An order delivered before
/// this was delivered on an earlier Dhaka day — i.e. it is now the next day.
function startOfTodayDhaka(): Date {
  const nowDhaka = new Date(Date.now() + DHAKA_OFFSET_MS)
  const startUtcMs =
    Date.UTC(nowDhaka.getUTCFullYear(), nowDhaka.getUTCMonth(), nowDhaka.getUTCDate()) - DHAKA_OFFSET_MS
  return new Date(startUtcMs)
}

/// Sends the day-after-delivery review invite (in-app notification + email) for
/// every delivered order that has not yet been invited and was delivered on a
/// previous day. Safe to call repeatedly — each order is invited at most once.
export async function dispatchReviewInvites(): Promise<number> {
  const cutoff = startOfTodayDhaka()
  const orders = await prisma.order.findMany({
    where: {
      status: 'DELIVERED',
      reviewInviteSentAt: null,
      deliveredAt: { not: null, lt: cutoff },
      // Guest orders have no account to notify or email, so skip them.
      customerId: { not: null },
    },
    include: { customer: { include: { user: { select: { name: true, email: true } } } } },
  })

  let sent = 0
  for (const order of orders) {
    if (!order.customerId || !order.customer) continue
    try {
      await notifyReviewInvite(order.customerId, order.orderNumber, order.id)

      const url = appLink(`/orders/${order.id}/review`)
      await sendEmail({
        to: order.customer.user.email,
        subject: `আপনার অর্ডার ${order.orderNumber} — রিভিউ দিন`,
        text:
          `প্রিয় ${order.customer.user.name},\n\n` +
          `আপনার অর্ডার ${order.orderNumber} ডেলিভার হয়েছে। খাবার কেমন লেগেছে জানিয়ে রিভিউ ও রেটিং দিন:\n${url}\n\n` +
          `ধন্যবাদ,\nছায়া বাড়ি`,
        html:
          `<p>প্রিয় ${escapeHtml(order.customer.user.name)},</p>` +
          `<p>আপনার অর্ডার <strong>${escapeHtml(order.orderNumber)}</strong> ডেলিভার হয়েছে। ` +
          `খাবার কেমন লেগেছে জানিয়ে রিভিউ ও রেটিং দিন:</p>` +
          `<p><a href="${url}">রিভিউ দিন</a></p>` +
          `<p>ধন্যবাদ,<br/>ছায়া বাড়ি</p>`,
      })

      await prisma.order.update({ where: { id: order.id }, data: { reviewInviteSentAt: new Date() } })
      sent += 1
    } catch (err) {
      logger.error('Failed to dispatch review invite', {
        orderId: order.id,
        message: err instanceof Error ? err.message : String(err),
      })
    }
  }

  if (sent > 0) logger.info('Dispatched review invites', { count: sent })
  return sent
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)
}

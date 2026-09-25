import { randomBytes } from 'node:crypto'
import type { Delivery, Order } from '@prisma/client'
import { prisma } from '../../lib/prisma.js'
import { logger } from '../../lib/logger.js'
import { appLink, sendEmail } from '../../lib/mailer.js'
import { HttpError } from '../../utils/httpError.js'
import { paymentTotals } from '../payments/payment.service.js'
import { buttonHtml, emailShell, escapeHtml, logoAttachment } from '../auth/verification.service.js'

// Public order tracking.
//
// Every order can carry a secret tracking token. The link /track/<token> shows
// the order's progress to whoever holds it, no login needed, so a customer who
// ordered as a guest or had an order placed for them by an admin (and so has
// no account yet) can still follow it. The token is 192 random bits, so it
// can't be guessed or enumerated; the page deliberately leaves out the street
// address and phone number in case the link gets forwarded.

function newToken(): string {
  return randomBytes(24).toString('base64url')
}

export function trackingLink(token: string): string {
  return appLink(`/track/${token}`)
}

/// The order's tracking token, created on first use.
export async function ensureTrackingToken(orderId: string): Promise<string> {
  const order = await prisma.order.findUniqueOrThrow({ where: { id: orderId }, select: { trackingToken: true } })
  if (order.trackingToken) return order.trackingToken
  const token = newToken()
  await prisma.order.updateMany({ where: { id: orderId, trackingToken: null }, data: { trackingToken: token } })
  // Re-read in case a concurrent call set it first.
  const fresh = await prisma.order.findUniqueOrThrow({ where: { id: orderId }, select: { trackingToken: true } })
  return fresh.trackingToken!
}

/// Where an order's emails go: the customer's account email, or the email a
/// guest left at checkout. Null when there is nowhere to send.
function recipientOf(order: Order & { customer: { user: { email: string; name: string } } | null }) {
  if (order.customer) return { email: order.customer.user.email, name: order.customer.user.name }
  if (order.guestEmail) return { email: order.guestEmail, name: order.recipientName }
  return null
}

/// Whether the email belongs to an account its owner can log into.
async function isRegisteredEmail(email: string): Promise<boolean> {
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } })
  return !!user && !user.isPlaceholder && user.emailVerifiedAt != null
}

const bdt = (n: number) => `৳${n.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`

/// Email the customer that their order is confirmed, with the tracking link.
/// Sent at most once per order, however it got confirmed (by an admin, or
/// automatically once fully paid online) and even if it's later re-confirmed.
/// Never throws: a mail failure must not break confirming the order.
export async function sendOrderConfirmedEmail(orderId: string): Promise<void> {
  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true, payments: true, customer: { include: { user: true } } },
    })
    if (!order || order.confirmationEmailSentAt) return
    // Every confirmed order gets a link, even with no email on file, so the
    // admin can share it another way (SMS, WhatsApp).
    const token = await ensureTrackingToken(order.id)
    const to = recipientOf(order)
    if (!to) return

    // Claim the send atomically so two concurrent confirmations can't both mail.
    const claimed = await prisma.order.updateMany({
      where: { id: order.id, confirmationEmailSentAt: null },
      data: { confirmationEmailSentAt: new Date() },
    })
    if (claimed.count === 0) return

    const url = trackingLink(token)
    const registered = await isRegisteredEmail(to.email)
    const registerUrl = appLink(`/register?email=${encodeURIComponent(to.email)}`)
    const { amountDue } = paymentTotals(order.payments, order.total)
    const when = `${order.fulfillmentDate.toISOString().slice(0, 10)}${order.timeSlot ? ` · ${order.timeSlot}` : ''}`

    const itemsText = order.items.map((i) => `  • ${i.productName} × ${i.quantity} — ${bdt(Number(i.lineTotal))}`).join('\n')
    const itemsHtml = order.items
      .map(
        (i) =>
          `<tr><td style="padding:4px 0;font-size:14px;color:#444;">${escapeHtml(i.productName)} × ${i.quantity}</td>` +
          `<td style="padding:4px 0;font-size:14px;color:#444;text-align:right;">${bdt(Number(i.lineTotal))}</td></tr>`,
      )
      .join('')
    const payLine =
      amountDue <= 0
        ? 'পেমেন্ট সম্পূর্ণ · Fully paid'
        : order.paymentMode === 'COD'
          ? `ডেলিভারির সময় পরিশোধ করুন · Pay on delivery: ${bdt(amountDue)}`
          : `বাকি · Due: ${bdt(amountDue)}`

    const accountText = registered
      ? 'You can also see it under "My orders" when you log in.'
      : `Create an account with ${to.email} to see all your orders in one place: ${registerUrl}`
    const accountHtml = registered
      ? `<p style="margin:0;font-size:13px;line-height:1.5;color:#888;">আপনার অ্যাকাউন্টে লগইন করে “আমার অর্ডার”-এও দেখতে পারবেন। · You can also find it under “My orders” when you log in.</p>`
      : `<p style="margin:0 0 12px;font-size:13px;line-height:1.5;color:#888;">এই ইমেইল (<strong>${escapeHtml(to.email)}</strong>) দিয়ে অ্যাকাউন্ট খুললে আপনার সব অর্ডার এক জায়গায় পাবেন। · Create an account with this email and all your orders will be waiting there.</p>` +
        `<div style="text-align:center;margin:0 0 8px;">${buttonHtml(registerUrl, 'অ্যাকাউন্ট খুলুন · Create account', 'gold')}</div>`

    const inner = `
    <p style="margin:0 0 8px;font-size:16px;">প্রিয় ${escapeHtml(to.name)},</p>
    <p style="margin:0 0 18px;font-size:15px;line-height:1.5;color:#555;">আপনার অর্ডার <strong>${escapeHtml(order.orderNumber)}</strong> নিশ্চিত হয়েছে ✅<br/>Your order has been confirmed.</p>
    <p style="margin:0 0 6px;font-size:14px;color:#555;">ডেলিভারি · Delivery: <strong>${escapeHtml(when)}</strong></p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:8px 0 6px;border-top:1px solid #eee;border-bottom:1px solid #eee;">${itemsHtml}
      <tr><td style="padding:6px 0;font-size:14px;font-weight:700;">মোট · Total</td><td style="padding:6px 0;font-size:14px;font-weight:700;text-align:right;">${bdt(Number(order.total))}</td></tr>
    </table>
    <p style="margin:0 0 20px;font-size:13px;color:#777;">${escapeHtml(payLine)}</p>
    <div style="text-align:center;margin:0 0 18px;">${buttonHtml(url, 'অর্ডার ট্র্যাক করুন · Track your order')}</div>
    ${accountHtml}`

    await sendEmail({
      to: to.email,
      subject: `অর্ডার ${order.orderNumber} নিশ্চিত হয়েছে · Your Chaya Bari order is confirmed`,
      text:
        `প্রিয় ${to.name},\n\n` +
        `Your order ${order.orderNumber} has been confirmed.\n` +
        `Delivery: ${when}\n\n${itemsText}\n  Total: ${bdt(Number(order.total))}\n${payLine}\n\n` +
        `Track your order: ${url}\n\n${accountText}\n\nছায়া বাড়ি · Chaya Bari`,
      html: emailShell(inner),
      attachments: logoAttachment(),
    })
  } catch (err) {
    logger.error('Failed to send order confirmation email', {
      orderId,
      message: err instanceof Error ? err.message : String(err),
    })
  }
}

export interface TrackedOrder {
  orderNumber: string
  status: Order['status']
  paymentStatus: Order['paymentStatus']
  paymentMode: Order['paymentMode']
  fulfillmentDate: string
  timeSlot: string | null
  recipientName: string
  area: string | null
  city: string
  items: { productName: string; quantity: number; unitPrice: number; lineTotal: number }[]
  subtotal: number
  productDiscount: number
  customerDeliveryCost: number
  deliveryDiscount: number
  total: number
  amountPaid: number
  amountDue: number
  createdAt: string
  delivery: { status: Delivery['status']; provider: string | null; trackingRef: string | null } | null
  /// Masked email the order belongs to, and whether it already has a usable
  /// account — the page invites unregistered customers to sign up with it.
  account: { maskedEmail: string | null; registered: boolean }
}

function maskEmail(email: string): string {
  const [local, domain] = email.split('@')
  const head = local.slice(0, Math.min(2, local.length))
  return `${head}${'*'.repeat(Math.max(1, local.length - head.length))}@${domain}`
}

/// Public view of an order by its tracking token (no login).
export async function getTrackedOrder(token: string): Promise<TrackedOrder> {
  const order = token
    ? await prisma.order.findUnique({
        where: { trackingToken: token },
        include: { items: true, payments: true, delivery: true, customer: { include: { user: true } } },
      })
    : null
  if (!order) throw HttpError.notFound('Order not found')

  const email = recipientOf(order)?.email ?? null
  const totals = paymentTotals(order.payments, order.total)
  return {
    orderNumber: order.orderNumber,
    status: order.status,
    paymentStatus: order.paymentStatus,
    paymentMode: order.paymentMode,
    fulfillmentDate: order.fulfillmentDate.toISOString().slice(0, 10),
    timeSlot: order.timeSlot,
    recipientName: order.recipientName,
    area: order.area,
    city: order.city,
    items: order.items.map((i) => ({
      productName: i.productName,
      quantity: i.quantity,
      unitPrice: Number(i.unitPrice),
      lineTotal: Number(i.lineTotal),
    })),
    subtotal: Number(order.subtotal),
    productDiscount: Number(order.productDiscount),
    customerDeliveryCost: Number(order.customerDeliveryCost),
    deliveryDiscount: Number(order.deliveryDiscount),
    total: Number(order.total),
    amountPaid: totals.amountPaid,
    amountDue: totals.amountDue,
    createdAt: order.createdAt.toISOString(),
    delivery: order.delivery
      ? { status: order.delivery.status, provider: order.delivery.provider, trackingRef: order.delivery.trackingRef }
      : null,
    // Only a masked email: the link may have been forwarded.
    account: {
      maskedEmail: email ? maskEmail(email) : null,
      registered: email ? await isRegisteredEmail(email) : false,
    },
  }
}

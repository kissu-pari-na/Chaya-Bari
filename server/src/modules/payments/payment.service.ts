import { Prisma, type Payment, type PaymentStatus } from '@prisma/client'
import { prisma } from '../../lib/prisma.js'
import { HttpError } from '../../utils/httpError.js'
import type { ClaimPaymentInput, RecordPaymentInput } from './payment.schemas.js'
import {
  notifyOrderStatus,
  notifyPaymentReceived,
  notifyPaymentSubmitted,
  notifyPaymentVerified,
} from '../notifications/notification.service.js'
import * as bkash from './bkash.js'

export interface PublicPayment {
  id: string
  orderId: string
  method: Payment['method']
  amount: number
  status: Payment['status']
  source: Payment['source']
  reference: string | null
  note: string | null
  createdAt: string
  /// Audit trail: who recorded this row (admin/refund), and — for a voided
  /// payment — who voided it, when, and why.
  recordedByName: string | null
  voidedByName: string | null
  voidedAt: string | null
  voidReason: string | null
}

export function toPublicPayment(p: Payment): PublicPayment {
  return {
    id: p.id,
    orderId: p.orderId,
    method: p.method,
    amount: Number(p.amount),
    status: p.status,
    source: p.source,
    reference: p.reference,
    note: p.note,
    createdAt: p.createdAt.toISOString(),
    recordedByName: p.recordedByName,
    voidedByName: p.voidedByName,
    voidedAt: p.voidedAt ? p.voidedAt.toISOString() : null,
    voidReason: p.voidReason,
  }
}

/// Resolve the acting admin's identity for the audit trail (name snapshot).
async function actor(adminId: string): Promise<{ id: string; name: string }> {
  const user = await prisma.user.findUnique({ where: { id: adminId }, select: { id: true, name: true } })
  return { id: adminId, name: user?.name ?? 'Admin' }
}

/// Net amount actually collected = successful payments minus refunds. Pending
/// (unverified) claims never count.
export function netPaid(payments: Payment[]): Prisma.Decimal {
  return payments.reduce((sum, p) => {
    if (p.status === 'SUCCESS') return sum.add(p.amount)
    if (p.status === 'REFUNDED') return sum.sub(p.amount)
    return sum
  }, new Prisma.Decimal(0))
}

/// Derives the order-level payment status from its payment rows and total.
export function derivePaymentStatus(payments: Payment[], total: Prisma.Decimal): PaymentStatus {
  const paid = netPaid(payments)
  const refunded = payments
    .filter((p) => p.status === 'REFUNDED')
    .reduce((s, p) => s.add(p.amount), new Prisma.Decimal(0))

  if (paid.gte(total) && total.gt(0)) return 'PAID'
  if (paid.gt(0)) return 'PARTIALLY_PAID'
  if (refunded.gt(0)) return 'REFUNDED'
  return 'PENDING'
}

async function recomputeOrderPaymentStatus(orderId: string): Promise<void> {
  const order = await prisma.order.findUnique({ where: { id: orderId }, include: { payments: true } })
  if (!order) return
  const paymentStatus = derivePaymentStatus(order.payments, order.total)

  // For PREPAID orders, keep the order status in sync with payment: auto-confirm
  // a pending order once it is fully paid so it reaches the kitchen without a
  // manual step, and reverse it if a payment-confirmed order is no longer fully
  // paid (e.g. a payment was voided or refunded) and the kitchen hasn't started
  // yet. Orders already progressed past CONFIRMED, or cancelled, are left alone.
  //
  // COD orders are collected on delivery, so payment never gates their status —
  // an admin drives their status manually and a (partial) cash payment recorded
  // at delivery must not confirm or revert the order. So we only recompute the
  // payment status for them.
  const paymentGates = order.paymentMode !== 'COD'
  const autoConfirm = paymentGates && paymentStatus === 'PAID' && order.status === 'PENDING'
  const autoRevert = paymentGates && paymentStatus !== 'PAID' && order.status === 'CONFIRMED'
  const nextStatus = autoConfirm ? 'CONFIRMED' : autoRevert ? 'PENDING' : order.status

  await prisma.order.update({
    where: { id: orderId },
    data: { paymentStatus, ...(nextStatus !== order.status ? { status: nextStatus } : {}) },
  })

  if (nextStatus !== order.status) {
    await notifyOrderStatus(order.customerId, nextStatus, order.orderNumber, order.id)
  }
}

/// Loads an order and asserts it belongs to the given customer.
async function ownedOrder(orderId: string, customerId: string) {
  const order = await prisma.order.findUnique({ where: { id: orderId } })
  if (!order || order.customerId !== customerId) throw HttpError.notFound('Order not found')
  return order
}

/// Outstanding amount for an order (never below 0).
async function outstanding(orderId: string, total: Prisma.Decimal): Promise<Prisma.Decimal> {
  const payments = await prisma.payment.findMany({ where: { orderId } })
  const due = total.sub(netPaid(payments))
  return due.gt(0) ? due : new Prisma.Decimal(0)
}

export async function listPayments(orderId: string): Promise<PublicPayment[]> {
  const payments = await prisma.payment.findMany({ where: { orderId }, orderBy: { createdAt: 'asc' } })
  return payments.map(toPublicPayment)
}

// ---- Admin: record a confirmed payment directly ----

export async function recordPayment(
  orderId: string,
  input: RecordPaymentInput,
  adminId: string,
): Promise<PublicPayment> {
  const order = await prisma.order.findUnique({ where: { id: orderId } })
  if (!order) throw HttpError.notFound('Order not found')

  const admin = await actor(adminId)
  const payment = await prisma.payment.create({
    data: {
      orderId,
      method: input.method,
      amount: new Prisma.Decimal(input.amount),
      status: input.status ?? 'SUCCESS',
      source: 'ADMIN',
      reference: input.reference,
      note: input.note,
      recordedById: admin.id,
      recordedByName: admin.name,
    },
  })
  await recomputeOrderPaymentStatus(orderId)
  if (payment.status === 'SUCCESS') {
    await notifyPaymentReceived(order.customerId, Number(payment.amount), order.orderNumber, order.id)
  }
  return toPublicPayment(payment)
}

/// Void a payment recorded in error. The row is kept (never deleted) and marked
/// VOID with who/when/why, so it stops counting toward the paid total but stays
/// on the audit trail. Only a live payment (pending or successful) can be voided.
export async function voidPayment(id: string, adminId: string, reason?: string): Promise<PublicPayment> {
  const payment = await prisma.payment.findUnique({ where: { id } })
  if (!payment) throw HttpError.notFound('Payment not found')
  if (payment.status !== 'SUCCESS' && payment.status !== 'PENDING') {
    throw HttpError.badRequest('Only a pending or successful payment can be voided')
  }
  const admin = await actor(adminId)
  const updated = await prisma.payment.update({
    where: { id },
    data: {
      status: 'VOID',
      voidedAt: new Date(),
      voidedById: admin.id,
      voidedByName: admin.name,
      voidReason: reason ?? null,
    },
  })
  await recomputeOrderPaymentStatus(payment.orderId)
  return toPublicPayment(updated)
}

/// Refund a successful payment (money returned to the customer). Recorded as a
/// new REFUNDED row that offsets the original in the ledger, keeping the whole
/// history intact and stamping who issued the refund. Defaults to the full
/// amount; a partial amount is allowed up to what is still net-paid.
export async function refundPayment(
  id: string,
  adminId: string,
  amount?: number,
  reason?: string,
): Promise<PublicPayment> {
  const original = await prisma.payment.findUnique({ where: { id }, include: { order: true } })
  if (!original) throw HttpError.notFound('Payment not found')
  if (original.status !== 'SUCCESS') {
    throw HttpError.badRequest('Only a successful payment can be refunded')
  }

  const allPayments = await prisma.payment.findMany({ where: { orderId: original.orderId } })
  const netPaidNow = netPaid(allPayments)
  const refundAmount = amount != null ? new Prisma.Decimal(amount) : original.amount
  if (refundAmount.lte(0)) throw HttpError.badRequest('Refund amount must be greater than 0')
  if (refundAmount.gt(netPaidNow)) {
    throw HttpError.badRequest('Refund exceeds the amount currently paid')
  }

  const admin = await actor(adminId)
  const refund = await prisma.payment.create({
    data: {
      orderId: original.orderId,
      method: original.method,
      amount: refundAmount,
      status: 'REFUNDED',
      source: 'ADMIN',
      reference: original.reference,
      note: reason ?? 'Refund',
      recordedById: admin.id,
      recordedByName: admin.name,
    },
  })
  await recomputeOrderPaymentStatus(original.orderId)
  return toPublicPayment(refund)
}

// ---- Customer: submit a manual payment claim (awaits verification) ----

export async function submitClaim(orderId: string, customerId: string, input: ClaimPaymentInput): Promise<PublicPayment> {
  const order = await ownedOrder(orderId, customerId)

  const payment = await prisma.payment.create({
    data: {
      orderId,
      method: input.method,
      amount: new Prisma.Decimal(input.amount),
      status: 'PENDING',
      source: 'CUSTOMER',
      reference: input.reference,
      note: input.note,
    },
  })
  // A pending claim doesn't change the paid total, but keep status consistent.
  await recomputeOrderPaymentStatus(orderId)
  await notifyPaymentSubmitted(Number(payment.amount), input.method, order.orderNumber, order.id)
  return toPublicPayment(payment)
}

// ---- Admin: verify or reject a pending claim ----

export async function verifyPayment(id: string, action: 'verify' | 'reject'): Promise<PublicPayment> {
  const payment = await prisma.payment.findUnique({ where: { id }, include: { order: true } })
  if (!payment) throw HttpError.notFound('Payment not found')
  if (payment.status !== 'PENDING') throw HttpError.badRequest('Only pending payments can be verified')

  const updated = await prisma.payment.update({
    where: { id },
    data: { status: action === 'verify' ? 'SUCCESS' : 'FAILED' },
  })
  await recomputeOrderPaymentStatus(payment.orderId)
  await notifyPaymentVerified(
    payment.order.customerId,
    action === 'verify',
    Number(updated.amount),
    payment.order.orderNumber,
    payment.orderId,
  )
  return toPublicPayment(updated)
}

// ---- Customer: bKash online payment ----

export interface BkashStart {
  paymentID: string
  bkashURL: string
  mock: boolean
}

export async function startBkashPayment(
  orderId: string,
  customerId: string,
  callbackURL: string,
  requestedAmount?: number,
): Promise<BkashStart> {
  const order = await ownedOrder(orderId, customerId)
  const due = await outstanding(orderId, order.total)
  if (due.lte(0)) throw HttpError.badRequest('This order has no outstanding amount')

  const amount = requestedAmount ? new Prisma.Decimal(requestedAmount) : due
  if (amount.gt(due)) throw HttpError.badRequest('Amount exceeds the outstanding due')

  const result = await bkash.createPayment({
    amount: Number(amount),
    callbackURL,
    payerReference: order.recipientPhone || order.orderNumber,
    merchantInvoiceNumber: order.orderNumber,
  })

  // Record a pending row so the attempt is traceable; execute flips it to SUCCESS.
  await prisma.payment.create({
    data: {
      orderId,
      method: 'BKASH',
      amount,
      status: 'PENDING',
      source: 'CUSTOMER',
      reference: result.paymentID,
      note: result.mock ? 'bKash (sandbox)' : 'bKash',
    },
  })
  return result
}

export async function executeBkashPayment(
  orderId: string,
  customerId: string,
  paymentID: string,
): Promise<{ payment: PublicPayment; status: 'completed' | 'failed' }> {
  const order = await ownedOrder(orderId, customerId)
  const row = await prisma.payment.findFirst({ where: { orderId, reference: paymentID } })
  if (!row) throw HttpError.notFound('Payment attempt not found')

  // Idempotency: if already settled, just report it.
  if (row.status === 'SUCCESS') return { payment: toPublicPayment(row), status: 'completed' }

  const result = await bkash.executePayment(paymentID, Number(row.amount))
  if (result.status !== 'Completed') {
    const failed = await prisma.payment.update({ where: { id: row.id }, data: { status: 'FAILED' } })
    return { payment: toPublicPayment(failed), status: 'failed' }
  }

  const settled = await prisma.payment.update({
    where: { id: row.id },
    data: { status: 'SUCCESS', reference: result.trxID, note: row.note ?? 'bKash' },
  })
  await recomputeOrderPaymentStatus(orderId)
  await notifyPaymentReceived(order.customerId, Number(settled.amount), order.orderNumber, order.id)
  return { payment: toPublicPayment(settled), status: 'completed' }
}

/// Paid / due totals for one order, from its payments.
export function paymentTotals(payments: Payment[], total: Prisma.Decimal): { amountPaid: number; amountDue: number } {
  const paid = netPaid(payments)
  const due = total.sub(paid)
  return {
    amountPaid: Number(paid),
    amountDue: Number(due.gt(0) ? due : new Prisma.Decimal(0)),
  }
}

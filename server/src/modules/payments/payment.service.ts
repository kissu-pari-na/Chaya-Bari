import { Prisma, type Payment, type PaymentStatus } from '@prisma/client'
import { prisma } from '../../lib/prisma.js'
import { HttpError } from '../../utils/httpError.js'
import type { RecordPaymentInput } from './payment.schemas.js'
import { notifyPaymentReceived } from '../notifications/notification.service.js'

export interface PublicPayment {
  id: string
  orderId: string
  method: Payment['method']
  amount: number
  status: Payment['status']
  reference: string | null
  note: string | null
  createdAt: string
}

export function toPublicPayment(p: Payment): PublicPayment {
  return {
    id: p.id,
    orderId: p.orderId,
    method: p.method,
    amount: Number(p.amount),
    status: p.status,
    reference: p.reference,
    note: p.note,
    createdAt: p.createdAt.toISOString(),
  }
}

/// Net amount actually collected = successful payments minus refunds.
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
  const status = derivePaymentStatus(order.payments, order.total)
  await prisma.order.update({ where: { id: orderId }, data: { paymentStatus: status } })
}

export async function listPayments(orderId: string): Promise<PublicPayment[]> {
  const payments = await prisma.payment.findMany({ where: { orderId }, orderBy: { createdAt: 'asc' } })
  return payments.map(toPublicPayment)
}

export async function recordPayment(orderId: string, input: RecordPaymentInput): Promise<PublicPayment> {
  const order = await prisma.order.findUnique({ where: { id: orderId } })
  if (!order) throw HttpError.notFound('Order not found')

  const payment = await prisma.payment.create({
    data: {
      orderId,
      method: input.method,
      amount: new Prisma.Decimal(input.amount),
      status: input.status ?? 'SUCCESS',
      reference: input.reference,
      note: input.note,
    },
  })
  await recomputeOrderPaymentStatus(orderId)
  if (payment.status === 'SUCCESS') {
    await notifyPaymentReceived(order.customerId, Number(payment.amount), order.orderNumber, order.id)
  }
  return toPublicPayment(payment)
}

export async function deletePayment(id: string): Promise<void> {
  const payment = await prisma.payment.findUnique({ where: { id } })
  if (!payment) throw HttpError.notFound('Payment not found')
  await prisma.payment.delete({ where: { id } })
  await recomputeOrderPaymentStatus(payment.orderId)
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

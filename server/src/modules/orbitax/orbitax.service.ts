import { type Order, type Payment } from '@prisma/client'
import { prisma } from '../../lib/prisma.js'
import { HttpError } from '../../utils/httpError.js'
import { isOrbitaxEmail } from '../../utils/orbitax.js'
import { paymentTotals, submitClaim, type PublicPayment } from '../payments/payment.service.js'
import type { OrbitaxPayInput } from './orbitax.schemas.js'

/// One outstanding (or recently settled) order in the Orbitax billing view.
export interface OrbitaxOrderSummary {
  id: string
  orderNumber: string
  fulfillmentDate: string
  createdAt: string
  status: Order['status']
  paymentStatus: Order['paymentStatus']
  paymentMode: Order['paymentMode']
  total: number
  amountPaid: number
  amountDue: number
}

export interface OrbitaxAccount {
  /// Whether the signed-in user is an Orbitax staff member (drives the header
  /// icon on the client).
  isOrbitax: boolean
  name: string
  email: string
  /// Combined amount still owed across all non-cancelled orders.
  totalDue: number
  /// Combined amount already paid (net of refunds) across those orders.
  totalPaid: number
  /// Count of orders that still have an outstanding balance.
  outstandingOrders: number
  /// Orders with an outstanding balance, oldest first (what a payment settles).
  orders: OrbitaxOrderSummary[]
}

type OrderWithPayments = Order & { payments: Payment[] }

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100
}

function toSummary(order: OrderWithPayments): OrbitaxOrderSummary {
  const totals = paymentTotals(order.payments, order.total)
  return {
    id: order.id,
    orderNumber: order.orderNumber,
    fulfillmentDate: order.fulfillmentDate.toISOString().slice(0, 10),
    createdAt: order.createdAt.toISOString(),
    status: order.status,
    paymentStatus: order.paymentStatus,
    paymentMode: order.paymentMode,
    total: Number(order.total),
    amountPaid: totals.amountPaid,
    amountDue: totals.amountDue,
  }
}

/// Loads the acting user and asserts they are Orbitax staff (else 403).
async function requireOrbitaxUser(userId: string): Promise<{ name: string; email: string }> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { name: true, email: true } })
  if (!user || !isOrbitaxEmail(user.email)) {
    throw HttpError.forbidden('This billing page is only available to Orbitax accounts')
  }
  return user
}

/// All of the user's non-cancelled orders that still owe money, oldest first.
async function outstandingOrders(customerId: string): Promise<OrderWithPayments[]> {
  const orders = await prisma.order.findMany({
    where: { customerId, status: { not: 'CANCELLED' } },
    include: { payments: true },
    orderBy: { createdAt: 'asc' },
  })
  return orders.filter((o) => paymentTotals(o.payments, o.total).amountDue > 0)
}

export async function getAccount(userId: string): Promise<OrbitaxAccount> {
  const user = await requireOrbitaxUser(userId)
  const customer = await prisma.customer.findUnique({ where: { userId } })

  if (!customer) {
    return {
      isOrbitax: true,
      name: user.name,
      email: user.email,
      totalDue: 0,
      totalPaid: 0,
      outstandingOrders: 0,
      orders: [],
    }
  }

  // Totals span every non-cancelled order (paid ones included in totalPaid);
  // the order list only shows the ones with a balance still to settle.
  const allOrders = await prisma.order.findMany({
    where: { customerId: customer.id, status: { not: 'CANCELLED' } },
    include: { payments: true },
    orderBy: { createdAt: 'asc' },
  })

  let totalDue = 0
  let totalPaid = 0
  const orders: OrbitaxOrderSummary[] = []
  for (const order of allOrders) {
    const summary = toSummary(order)
    totalDue += summary.amountDue
    totalPaid += summary.amountPaid
    if (summary.amountDue > 0) orders.push(summary)
  }

  return {
    isOrbitax: true,
    name: user.name,
    email: user.email,
    totalDue: round2(totalDue),
    totalPaid: round2(totalPaid),
    outstandingOrders: orders.length,
    orders,
  }
}

export interface OrbitaxPayResult {
  /// The claims created, one per order the payment was allocated to.
  claims: PublicPayment[]
  /// The refreshed account after the claims were recorded.
  account: OrbitaxAccount
}

/// Settle a lump amount against the combined outstanding balance. The amount is
/// allocated across unpaid orders oldest-first, and each allocation is recorded
/// as a customer payment claim (awaiting admin verification), reusing the same
/// per-order flow so ownership checks, notifications, and status recompute all
/// apply consistently.
export async function payOutstanding(userId: string, input: OrbitaxPayInput): Promise<OrbitaxPayResult> {
  await requireOrbitaxUser(userId)
  const customer = await prisma.customer.findUnique({ where: { userId } })
  if (!customer) throw HttpError.badRequest('No orders to pay for on this account')

  const orders = await outstandingOrders(customer.id)
  const totalDue = round2(
    orders.reduce((sum, o) => sum + paymentTotals(o.payments, o.total).amountDue, 0),
  )
  if (totalDue <= 0) throw HttpError.badRequest('You have no outstanding balance to pay')

  let remaining = round2(input.amount)
  if (remaining > totalDue) {
    throw HttpError.badRequest(
      `Amount exceeds your total outstanding balance of ৳${totalDue}`,
      { totalDue },
    )
  }

  const claims: PublicPayment[] = []
  for (const order of orders) {
    if (remaining <= 0) break
    const due = paymentTotals(order.payments, order.total).amountDue
    const allocation = round2(Math.min(remaining, due))
    if (allocation <= 0) continue
    const claim = await submitClaim(order.id, customer.id, {
      method: input.method,
      amount: allocation,
      reference: input.reference,
      note: input.note ?? 'Orbitax combined payment',
    })
    claims.push(claim)
    remaining = round2(remaining - allocation)
  }

  return { claims, account: await getAccount(userId) }
}

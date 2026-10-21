import { Prisma, type Order, type PaymentMethod, type WalletEntry } from '@prisma/client'
import { prisma } from '../../lib/prisma.js'
import { HttpError } from '../../utils/httpError.js'
import { getOrderingSetting } from '../orders/ordering.service.js'
import { sendOrderConfirmedEmail } from '../orders/tracking.service.js'
import {
  notifyOrderStatus,
  notifyWalletAdjusted,
  notifyWalletClaimReviewed,
  notifyWalletClaimSubmitted,
} from '../notifications/notification.service.js'

// The platform-wide wallet (vault node: wallet). One signed ledger per customer:
// + credits (money in), − debits (money owed). Balance = Σ CONFIRMED entries.
// A wallet may go below zero by at most its pay-later limit: the default from
// OrderingSetting plus any active promo-code grants.

type Db = Prisma.TransactionClient | typeof prisma
const ZERO = new Prisma.Decimal(0)
const dec = (n: number | Prisma.Decimal) => new Prisma.Decimal(n)

export interface Actor {
  id: string
  name: string
}

export async function actorOf(userId: string): Promise<Actor> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } })
  return { id: userId, name: user?.name ?? 'Admin' }
}

// ---------------------------------------------------------------- public shapes

export interface PublicWalletEntry {
  id: string
  type: WalletEntry['type']
  status: WalletEntry['status']
  amount: number
  method: WalletEntry['method']
  reference: string | null
  note: string | null
  source: WalletEntry['source']
  createdAt: string
  orderId: string | null
  orderNumber: string | null
  createdByName: string | null
  reviewedAt: string | null
  reviewedByName: string | null
  reviewNote: string | null
  /// Balance right after this entry (confirmed entries only; null otherwise).
  balanceAfter: number | null
}

export interface PublicLimitGrant {
  id: string
  code: string
  amount: number
  expiresAt: string
  createdAt: string
  active: boolean
}

export interface WalletSummary {
  customerId: string
  balance: number
  /// Amount owed (0 when the wallet is in credit).
  owed: number
  /// Spendable credit (0 when the wallet is in debt).
  credit: number
  baseLimit: number
  /// Current pay-later limit = base + active grants.
  limit: number
  /// How much a pay-later order may cost right now (balance + limit, never < 0).
  available: number
  pendingClaims: { count: number; amount: number }
  grants: PublicLimitGrant[]
}

type EntryWithOrder = WalletEntry & { order: { orderNumber: string } | null }

function toPublic(e: EntryWithOrder, balanceAfter: Prisma.Decimal | null = null): PublicWalletEntry {
  return {
    id: e.id,
    type: e.type,
    status: e.status,
    amount: Number(e.amount),
    method: e.method,
    reference: e.reference,
    note: e.note,
    source: e.source,
    createdAt: e.createdAt.toISOString(),
    orderId: e.orderId,
    orderNumber: e.order?.orderNumber ?? null,
    createdByName: e.createdByName,
    reviewedAt: e.reviewedAt?.toISOString() ?? null,
    reviewedByName: e.reviewedByName,
    reviewNote: e.reviewNote,
    balanceAfter: balanceAfter == null ? null : Number(balanceAfter),
  }
}

// ---------------------------------------------------------------- balance & limit

export async function balanceOf(customerId: string, db: Db = prisma): Promise<Prisma.Decimal> {
  const agg = await db.walletEntry.aggregate({ where: { customerId, status: 'CONFIRMED' }, _sum: { amount: true } })
  return agg._sum.amount ?? ZERO
}

export async function limitOf(customerId: string, db: Db = prisma): Promise<{ base: Prisma.Decimal; total: Prisma.Decimal }> {
  const setting = await getOrderingSetting()
  const grants = await db.walletLimitGrant.aggregate({
    where: { customerId, expiresAt: { gt: new Date() } },
    _sum: { amount: true },
  })
  const base = setting.walletCreditLimit
  return { base, total: base.add(grants._sum.amount ?? ZERO) }
}

/// Serialises wallet-changing work per customer (row lock on the customer), so
/// two simultaneous pay-later orders can't both slip under the limit.
async function lockCustomer(tx: Prisma.TransactionClient, customerId: string) {
  await tx.$queryRaw`SELECT "id" FROM "Customer" WHERE "id" = ${customerId} FOR UPDATE`
}

export async function walletSummary(customerId: string): Promise<WalletSummary> {
  const [balance, limit, pending, grants] = await Promise.all([
    balanceOf(customerId),
    limitOf(customerId),
    prisma.walletEntry.aggregate({
      where: { customerId, status: 'PENDING' },
      _sum: { amount: true },
      _count: true,
    }),
    prisma.walletLimitGrant.findMany({ where: { customerId }, orderBy: { createdAt: 'desc' } }),
  ])
  const now = new Date()
  const available = balance.add(limit.total)
  return {
    customerId,
    balance: Number(balance),
    owed: balance.lt(0) ? Number(balance.neg()) : 0,
    credit: balance.gt(0) ? Number(balance) : 0,
    baseLimit: Number(limit.base),
    limit: Number(limit.total),
    available: available.gt(0) ? Number(available) : 0,
    pendingClaims: { count: pending._count, amount: Number(pending._sum.amount ?? ZERO) },
    grants: grants.map((g) => ({
      id: g.id,
      code: g.code,
      amount: Number(g.amount),
      expiresAt: g.expiresAt.toISOString(),
      createdAt: g.createdAt.toISOString(),
      active: g.expiresAt > now,
    })),
  }
}

/// The wallet timeline, newest first, with the running balance after each
/// confirmed entry. (A home kitchen's customer has at most a few hundred
/// entries, so computing the running balance in memory is fine.)
export async function walletTimeline(customerId: string): Promise<PublicWalletEntry[]> {
  const entries = await prisma.walletEntry.findMany({
    where: { customerId },
    include: { order: { select: { orderNumber: true } } },
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
  })
  let running = ZERO
  const out = entries.map((e) => {
    if (e.status !== 'CONFIRMED') return toPublic(e)
    running = running.add(e.amount)
    return toPublic(e, running)
  })
  return out.reverse()
}

export async function orderEntries(orderId: string): Promise<PublicWalletEntry[]> {
  const entries = await prisma.walletEntry.findMany({
    where: { orderId },
    include: { order: { select: { orderNumber: true } } },
    orderBy: { createdAt: 'asc' },
  })
  return entries.map((e) => toPublic(e))
}

// ---------------------------------------------------------------- order charging

async function postCharge(db: Db, order: Order, note?: string) {
  await db.walletEntry.create({
    data: {
      customerId: order.customerId,
      orderId: order.id,
      type: 'ORDER_CHARGE',
      amount: order.total.neg(),
      note: note ?? `Order ${order.orderNumber}`,
      source: 'SYSTEM',
    },
  })
}

async function chargeOf(db: Db, orderId: string): Promise<Prisma.Decimal> {
  const agg = await db.walletEntry.aggregate({
    where: { orderId, status: 'CONFIRMED', type: { in: ['ORDER_CHARGE', 'ORDER_REFUND'] } },
    _sum: { amount: true },
  })
  return agg._sum.amount ?? ZERO // negative while the order is charged
}

/// Confirms a pay-first order whose payment just settled: status, customer
/// notification and the one-time "order confirmed" email.
async function confirmSettled(order: Order) {
  if (order.status !== 'PENDING') return
  await prisma.order.update({ where: { id: order.id }, data: { status: 'CONFIRMED' } })
  await notifyOrderStatus(order.customerId, 'CONFIRMED', order.orderNumber, order.id)
  await sendOrderConfirmedEmail(order.id)
}

/// Applies the chosen payment mode to a freshly placed order:
///  - PAY_LATER: charged to the wallet now, if it stays within the limit.
///  - PAY_FIRST: if the wallet already holds enough credit, it is charged and the
///    order confirms at once; otherwise it waits for a payment.
///  - COD: nothing until delivery.
/// Throws (and the caller must not keep the order) when pay later exceeds the limit.
export async function applyPaymentMode(orderId: string): Promise<void> {
  const order = await prisma.order.findUniqueOrThrow({ where: { id: orderId } })
  if (order.paymentMode === 'PAY_LATER') {
    if (!order.customerId) throw HttpError.badRequest('Pay later needs an account. Please sign in with Google.')
    const customerId = order.customerId
    await prisma.$transaction(async (tx) => {
      await lockCustomer(tx, customerId)
      const [balance, limit] = await Promise.all([balanceOf(customerId, tx), limitOf(customerId, tx)])
      const after = balance.sub(order.total)
      if (after.lt(limit.total.neg())) {
        const available = balance.add(limit.total)
        throw new HttpError(
          400,
          `This order is more than your pay-later limit. You can pay later up to ৳${available.gt(0) ? available.toFixed(0) : 0} right now (limit ৳${limit.total.toFixed(0)}). Choose pay first or cash on delivery, or clear your wallet.`,
          { available: Number(available.gt(0) ? available : ZERO), limit: Number(limit.total) },
          'WALLET_LIMIT',
        )
      }
      await postCharge(tx, order, `Order ${order.orderNumber} (pay later)`)
      await tx.order.update({ where: { id: order.id }, data: { paymentStatus: 'ON_WALLET' } })
    })
    return
  }
  if (order.paymentMode === 'PAY_FIRST') await settlePayFirst({ orderId })
}

/// Settles pending pay-first orders whose payment is now covered, oldest first.
/// An order is covered when the confirmed payments made *for it* plus any free
/// wallet credit reach its total. Settling posts the charge, marks it PAID and
/// confirms it. Guest orders (no wallet) need their own payments to cover them.
export async function settlePayFirst(scope: { customerId?: string | null; orderId?: string }): Promise<void> {
  const where: Prisma.OrderWhereInput = {
    paymentMode: 'PAY_FIRST',
    paymentStatus: 'PENDING',
    status: 'PENDING',
    ...(scope.orderId ? { id: scope.orderId } : {}),
    ...(scope.customerId ? { customerId: scope.customerId } : {}),
  }
  const candidates = await prisma.order.findMany({ where, orderBy: { createdAt: 'asc' } })
  for (const candidate of candidates) {
    const settled = await prisma.$transaction(async (tx) => {
      if (candidate.customerId) await lockCustomer(tx, candidate.customerId)
      const order = await tx.order.findUniqueOrThrow({ where: { id: candidate.id } })
      if (order.paymentStatus !== 'PENDING' || order.status !== 'PENDING' || order.paymentMode !== 'PAY_FIRST') return null
      const linked = await tx.walletEntry.aggregate({
        where: { orderId: order.id, status: 'CONFIRMED', type: 'PAYMENT' },
        _sum: { amount: true },
      })
      const forThis = linked._sum.amount ?? ZERO
      let cover = forThis
      if (order.customerId) {
        const balance = await balanceOf(order.customerId, tx)
        const freeCredit = balance.sub(forThis)
        if (freeCredit.gt(0)) cover = cover.add(freeCredit)
      }
      if (cover.lt(order.total)) return null
      await postCharge(tx, order)
      return tx.order.update({ where: { id: order.id }, data: { paymentStatus: 'PAID' } })
    })
    if (settled) await confirmSettled(settled)
  }
}

/// Reverses an order's charge when it is cancelled. Money the customer already
/// paid stays in the wallet as credit (spendable on the next order, or paid back
/// by an admin with a debit adjustment).
export async function reverseOrderCharge(orderId: string): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUniqueOrThrow({ where: { id: orderId } })
    if (order.customerId) await lockCustomer(tx, order.customerId)
    const charged = await chargeOf(tx, orderId)
    if (charged.lt(0)) {
      await tx.walletEntry.create({
        data: {
          customerId: order.customerId,
          orderId,
          type: 'ORDER_REFUND',
          amount: charged.neg(),
          note: `Order ${order.orderNumber} cancelled`,
          source: 'SYSTEM',
        },
      })
      await tx.order.update({ where: { id: orderId }, data: { paymentStatus: 'REFUNDED' } })
    }
  })
}

/// Switches a still-PENDING order to another payment mode: reverses any charge,
/// then applies the new mode (which may refuse pay later over the limit).
export async function changeMode(orderId: string, mode: Order['paymentMode']): Promise<void> {
  const order = await prisma.order.findUniqueOrThrow({ where: { id: orderId } })
  if (order.status !== 'PENDING') throw HttpError.badRequest('Payment method can only be changed before the order is confirmed')
  if (order.paymentMode === mode) return
  if (mode === 'PAY_LATER' && !order.customerId) throw HttpError.badRequest('Pay later needs an account.')
  const charged = await chargeOf(prisma, orderId)
  if (charged.lt(0)) {
    await prisma.walletEntry.create({
      data: {
        customerId: order.customerId,
        orderId,
        type: 'ORDER_REFUND',
        amount: charged.neg(),
        note: `Order ${order.orderNumber}: payment method changed`,
        source: 'SYSTEM',
      },
    })
  }
  await prisma.order.update({ where: { id: orderId }, data: { paymentMode: mode, paymentStatus: 'PENDING' } })
  try {
    await applyPaymentMode(orderId)
  } catch (err) {
    // Put the old mode back (and re-charge it) so the order never ends up half-switched.
    await prisma.order.update({ where: { id: orderId }, data: { paymentMode: order.paymentMode, paymentStatus: 'PENDING' } })
    await applyPaymentMode(orderId).catch(() => {})
    throw err
  }
}

/// Cash on delivery: when the order is delivered, charge it and record the cash
/// collected. A shortfall stays on the wallet as debt (ON_WALLET).
export async function collectOnDelivery(
  order: Order,
  collected: number,
  admin: Actor,
  method: PaymentMethod = 'CASH',
  reference?: string,
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    if (order.customerId) await lockCustomer(tx, order.customerId)
    const charged = await chargeOf(tx, order.id)
    if (charged.gte(0)) await postCharge(tx, order, `Order ${order.orderNumber} (cash on delivery)`)
    if (collected > 0) {
      await tx.walletEntry.create({
        data: {
          customerId: order.customerId,
          orderId: order.id,
          type: 'PAYMENT',
          amount: dec(collected),
          method,
          reference: reference || null,
          note: 'Collected on delivery',
          source: 'ADMIN',
          createdById: admin.id,
          createdByName: admin.name,
        },
      })
    }
    const paid = await tx.walletEntry.aggregate({
      where: { orderId: order.id, status: 'CONFIRMED', type: 'PAYMENT' },
      _sum: { amount: true },
    })
    const fully = (paid._sum.amount ?? ZERO).gte(order.total)
    await tx.order.update({
      where: { id: order.id },
      data: { paymentStatus: fully ? 'PAID' : order.customerId ? 'ON_WALLET' : 'PARTIALLY_PAID' },
    })
  })
}

// ---------------------------------------------------------------- claims (customer → admin review)

export interface ClaimInput {
  amount: number
  method: PaymentMethod
  reference: string
  note?: string
  orderId?: string
}

/// A customer reports a manual payment (bKash/Nagad/Rocket/bank) with its
/// reference. It counts only once an admin confirms it.
export async function submitClaim(customerId: string, input: ClaimInput): Promise<PublicWalletEntry> {
  if (input.orderId) {
    const order = await prisma.order.findUnique({ where: { id: input.orderId } })
    if (!order || order.customerId !== customerId) throw HttpError.notFound('Order not found')
    if (order.status === 'CANCELLED') throw HttpError.badRequest('This order is cancelled.')
  }
  const duplicate = await prisma.walletEntry.findFirst({
    where: { reference: input.reference, type: 'PAYMENT', status: { in: ['PENDING', 'CONFIRMED'] } },
  })
  if (duplicate) throw HttpError.conflict('A payment with this reference was already submitted.')
  const entry = await prisma.walletEntry.create({
    data: {
      customerId,
      orderId: input.orderId ?? null,
      type: 'PAYMENT',
      status: 'PENDING',
      amount: dec(input.amount),
      method: input.method,
      reference: input.reference,
      note: input.note || null,
      source: 'CUSTOMER',
    },
    include: { order: { select: { orderNumber: true } }, customer: { include: { user: true } } },
  })
  await notifyWalletClaimSubmitted(entry.customer?.user.name ?? 'Customer', input.amount, input.method, customerId)
  return toPublic(entry)
}

/// Admin confirms or rejects a pending claim. Confirming credits the wallet and
/// settles any pay-first order it now covers.
export async function reviewClaim(
  entryId: string,
  action: 'confirm' | 'reject',
  admin: Actor,
  note?: string,
): Promise<PublicWalletEntry> {
  const entry = await prisma.walletEntry.findUnique({ where: { id: entryId } })
  if (!entry) throw HttpError.notFound('Claim not found')
  if (entry.status !== 'PENDING') throw HttpError.badRequest('This claim was already reviewed.')
  if (action === 'reject' && !note) throw HttpError.badRequest('Please give a reason for rejecting.')
  const updated = await prisma.walletEntry.update({
    where: { id: entryId },
    data: {
      status: action === 'confirm' ? 'CONFIRMED' : 'REJECTED',
      reviewedAt: new Date(),
      reviewedById: admin.id,
      reviewedByName: admin.name,
      reviewNote: note || null,
    },
    include: { order: { select: { orderNumber: true } } },
  })
  if (action === 'confirm') {
    if (entry.customerId) await settlePayFirst({ customerId: entry.customerId })
    else if (entry.orderId) await settlePayFirst({ orderId: entry.orderId })
  }
  await notifyWalletClaimReviewed(entry.customerId, action === 'confirm', Number(entry.amount), note)
  return toPublic(updated)
}

export interface PendingClaim extends PublicWalletEntry {
  customer: { id: string | null; name: string; email: string | null; phone: string | null }
}

/// Every claim waiting for review, oldest first (the admin's to-do list).
export async function pendingClaims(): Promise<PendingClaim[]> {
  const rows = await prisma.walletEntry.findMany({
    where: { status: 'PENDING' },
    include: { order: { select: { orderNumber: true, recipientName: true, recipientPhone: true } }, customer: { include: { user: true } } },
    orderBy: { createdAt: 'asc' },
  })
  return rows.map((r) => ({
    ...toPublic(r),
    customer: r.customer
      ? { id: r.customer.id, name: r.customer.user.name, email: r.customer.user.email, phone: r.customer.user.phone }
      : { id: null, name: r.order?.recipientName ?? 'Guest', email: null, phone: r.order?.recipientPhone ?? null },
  }))
}

// ---------------------------------------------------------------- admin actions

export interface AdjustInput {
  /// Signed: + credits the wallet, − debits it.
  amount: number
  reference: string
  note?: string
  method?: PaymentMethod
  orderId?: string
}

/// Admin adjusts a customer's wallet (correction, goodwill credit, cash paid
/// back…). Always confirmed, always with a reference, never deleted.
export async function adjust(customerId: string, input: AdjustInput, admin: Actor): Promise<PublicWalletEntry> {
  if (input.amount === 0) throw HttpError.badRequest('Amount cannot be zero')
  const customer = await prisma.customer.findUnique({ where: { id: customerId } })
  if (!customer) throw HttpError.notFound('Customer not found')
  const entry = await prisma.walletEntry.create({
    data: {
      customerId,
      orderId: input.orderId ?? null,
      type: 'ADJUSTMENT',
      amount: dec(input.amount),
      method: input.method ?? null,
      reference: input.reference,
      note: input.note || null,
      source: 'ADMIN',
      createdById: admin.id,
      createdByName: admin.name,
    },
    include: { order: { select: { orderNumber: true } } },
  })
  if (input.amount > 0) await settlePayFirst({ customerId })
  await notifyWalletAdjusted(customerId, input.amount, input.reference)
  return toPublic(entry)
}

/// Admin records a payment received for an order (e.g. a guest paid by bKash,
/// or cash at the counter). Confirmed immediately; may settle the order.
export async function recordOrderPayment(
  orderId: string,
  input: { amount: number; method: PaymentMethod; reference: string; note?: string },
  admin: Actor,
): Promise<PublicWalletEntry> {
  const order = await prisma.order.findUnique({ where: { id: orderId } })
  if (!order) throw HttpError.notFound('Order not found')
  const entry = await prisma.walletEntry.create({
    data: {
      customerId: order.customerId,
      orderId,
      type: 'PAYMENT',
      amount: dec(input.amount),
      method: input.method,
      reference: input.reference,
      note: input.note || null,
      source: 'ADMIN',
      createdById: admin.id,
      createdByName: admin.name,
    },
    include: { order: { select: { orderNumber: true } } },
  })
  if (order.customerId) await settlePayFirst({ customerId: order.customerId })
  else await settlePayFirst({ orderId })
  return toPublic(entry)
}

export interface WalletRow {
  customerId: string
  name: string
  email: string
  phone: string | null
  balance: number
  limit: number
  pendingClaims: number
  lastActivity: string | null
}

/// Every customer with wallet activity, most owed first. Optional search by
/// name, email or phone.
export async function listWallets(search?: string): Promise<WalletRow[]> {
  const [sums, pending, grants, last, setting] = await Promise.all([
    prisma.walletEntry.groupBy({ by: ['customerId'], where: { status: 'CONFIRMED' }, _sum: { amount: true } }),
    prisma.walletEntry.groupBy({ by: ['customerId'], where: { status: 'PENDING' }, _count: true }),
    prisma.walletLimitGrant.groupBy({ by: ['customerId'], where: { expiresAt: { gt: new Date() } }, _sum: { amount: true } }),
    prisma.walletEntry.groupBy({ by: ['customerId'], _max: { createdAt: true } }),
    getOrderingSetting(),
  ])
  const ids = [...new Set([...sums, ...pending, ...grants].map((r) => r.customerId).filter((x): x is string => !!x))]
  const q = search?.trim()
  const customers = await prisma.customer.findMany({
    where: {
      id: { in: ids },
      ...(q
        ? {
            user: {
              OR: [
                { name: { contains: q, mode: 'insensitive' } },
                { email: { contains: q, mode: 'insensitive' } },
                { phone: { contains: q } },
              ],
            },
          }
        : {}),
    },
    include: { user: true },
  })
  const by = <T extends { customerId: string | null }>(rows: T[]) => new Map(rows.map((r) => [r.customerId, r]))
  const sumMap = by(sums)
  const pendingMap = by(pending)
  const grantMap = by(grants)
  const lastMap = by(last)
  return customers
    .map((c) => {
      const balance = sumMap.get(c.id)?._sum.amount ?? ZERO
      const extra = grantMap.get(c.id)?._sum.amount ?? ZERO
      return {
        customerId: c.id,
        name: c.user.name,
        email: c.user.email,
        phone: c.user.phone,
        balance: Number(balance),
        limit: Number(setting.walletCreditLimit.add(extra)),
        pendingClaims: pendingMap.get(c.id)?._count ?? 0,
        lastActivity: lastMap.get(c.id)?._max.createdAt?.toISOString() ?? null,
      }
    })
    .sort((a, b) => a.balance - b.balance)
}

/// Totals for the admin dashboard: money owed across wallets, credit held, and
/// claims waiting for review.
export async function walletTotals(): Promise<{ owed: number; credit: number; pendingClaims: number; pendingAmount: number }> {
  const [sums, pending] = await Promise.all([
    prisma.walletEntry.groupBy({ by: ['customerId'], where: { status: 'CONFIRMED', customerId: { not: null } }, _sum: { amount: true } }),
    prisma.walletEntry.aggregate({ where: { status: 'PENDING' }, _count: true, _sum: { amount: true } }),
  ])
  let owed = ZERO
  let credit = ZERO
  for (const s of sums) {
    const b = s._sum.amount ?? ZERO
    if (b.lt(0)) owed = owed.add(b.neg())
    else credit = credit.add(b)
  }
  return { owed: Number(owed), credit: Number(credit), pendingClaims: pending._count, pendingAmount: Number(pending._sum.amount ?? ZERO) }
}

// ---------------------------------------------------------------- promo codes that raise the limit

export async function redeemLimitCode(customerId: string, rawCode: string): Promise<PublicLimitGrant> {
  const code = rawCode.trim().toUpperCase()
  const coupon = await prisma.coupon.findUnique({ where: { code } })
  if (!coupon || coupon.scope !== 'WALLET_LIMIT' || !coupon.isActive) throw HttpError.badRequest('This code is not valid.')
  if (coupon.expiresAt && coupon.expiresAt < new Date()) throw HttpError.badRequest('This code has expired.')
  const already = await prisma.walletLimitGrant.findFirst({ where: { customerId, couponId: coupon.id } })
  if (already) throw HttpError.conflict('You have already used this code.')
  if (coupon.maxRedemptions != null) {
    const used = await prisma.walletLimitGrant.count({ where: { couponId: coupon.id } })
    if (used >= coupon.maxRedemptions) throw HttpError.badRequest('This code has been fully used.')
  }
  const days = coupon.limitDays ?? 30
  const grant = await prisma.walletLimitGrant.create({
    data: {
      customerId,
      couponId: coupon.id,
      code: coupon.code,
      amount: coupon.value,
      expiresAt: new Date(Date.now() + days * 24 * 60 * 60_000),
    },
  })
  return {
    id: grant.id,
    code: grant.code,
    amount: Number(grant.amount),
    expiresAt: grant.expiresAt.toISOString(),
    createdAt: grant.createdAt.toISOString(),
    active: true,
  }
}

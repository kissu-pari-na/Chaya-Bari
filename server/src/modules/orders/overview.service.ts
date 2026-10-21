import { prisma } from '../../lib/prisma.js'
import { getOrderingSetting, todayInZone } from './ordering.service.js'
import { walletTotals } from '../wallet/wallet.service.js'

/// The admin's "what needs me now" snapshot: counts for each step of the
/// five-step flow, today's deliveries, payments to review and money owed, plus
/// the orders that need an action, most urgent first.
export interface AdminOverview {
  today: string
  counts: {
    toConfirm: number
    awaitingPayment: number
    inKitchen: number
    readyToDispatch: number
    outForDelivery: number
    deliveredToday: number
    todaysOrders: number
  }
  wallet: { owed: number; credit: number; pendingClaims: number; pendingAmount: number }
  needsAction: {
    id: string
    orderNumber: string
    recipientName: string
    total: number
    status: string
    paymentMode: string
    fulfillmentDate: string
    timeSlot: string | null
    reason: 'confirm' | 'payment' | 'dispatch' | 'deliver'
  }[]
}

export async function adminOverview(): Promise<AdminOverview> {
  const setting = await getOrderingSetting()
  const today = todayInZone(setting.timezone)
  const todayDate = new Date(`${today}T00:00:00.000Z`)
  const startOfToday = new Date(`${today}T00:00:00+06:00`)

  const awaitingPaymentWhere = { status: 'PENDING' as const, paymentMode: 'PAY_FIRST' as const, paymentStatus: { not: 'PAID' as const } }
  const toConfirmWhere = { status: 'PENDING' as const, NOT: awaitingPaymentWhere }
  const readyWhere = { status: 'PREPARING' as const, readyAt: { not: null } }

  const [toConfirm, awaitingPayment, inKitchen, readyToDispatch, outForDelivery, deliveredToday, todaysOrders, wallet, actionRows] =
    await Promise.all([
      prisma.order.count({ where: toConfirmWhere }),
      prisma.order.count({ where: awaitingPaymentWhere }),
      prisma.order.count({ where: { status: { in: ['CONFIRMED', 'PREPARING'] } } }),
      prisma.order.count({ where: readyWhere }),
      prisma.order.count({ where: { status: 'OUT_FOR_DELIVERY' } }),
      prisma.order.count({ where: { status: 'DELIVERED', deliveredAt: { gte: startOfToday } } }),
      prisma.order.count({ where: { fulfillmentDate: todayDate, status: { not: 'CANCELLED' } } }),
      walletTotals(),
      prisma.order.findMany({
        where: { OR: [toConfirmWhere, awaitingPaymentWhere, readyWhere, { status: 'OUT_FOR_DELIVERY' }] },
        orderBy: [{ fulfillmentDate: 'asc' }, { timeSlot: 'asc' }, { createdAt: 'asc' }],
        take: 12,
      }),
    ])

  return {
    today,
    counts: { toConfirm, awaitingPayment, inKitchen, readyToDispatch, outForDelivery, deliveredToday, todaysOrders },
    wallet,
    needsAction: actionRows.map((o) => ({
      id: o.id,
      orderNumber: o.orderNumber,
      recipientName: o.recipientName,
      total: Number(o.total),
      status: o.status,
      paymentMode: o.paymentMode,
      fulfillmentDate: o.fulfillmentDate.toISOString().slice(0, 10),
      timeSlot: o.timeSlot,
      reason:
        o.status === 'OUT_FOR_DELIVERY'
          ? 'deliver'
          : o.status === 'PREPARING'
            ? 'dispatch'
            : o.paymentMode === 'PAY_FIRST' && o.paymentStatus !== 'PAID'
              ? 'payment'
              : 'confirm',
    })),
  }
}

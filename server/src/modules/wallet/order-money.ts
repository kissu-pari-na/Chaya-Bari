import { Prisma, type Order, type WalletEntry } from '@prisma/client'

/// What an order shows about money, derived from its wallet entries (no I/O, so
/// every service can use it without import cycles).
///  - amountPaid: money received against this order.
///  - amountDue:  what the customer still has to pay *for this order* before it
///                can move on (pay first) or at the door (cash on delivery).
///  - onWallet:   part of the order that was charged to the wallet instead
///                (pay later, or cash collected short); it is owed on the wallet.
export interface OrderMoney {
  amountPaid: number
  amountDue: number
  onWallet: number
}

const ZERO = new Prisma.Decimal(0)

export function orderMoney(
  order: Pick<Order, 'total' | 'paymentMode' | 'paymentStatus' | 'status'>,
  entries: Pick<WalletEntry, 'type' | 'status' | 'amount'>[],
): OrderMoney {
  const confirmed = entries.filter((e) => e.status === 'CONFIRMED')
  const paid = confirmed.filter((e) => e.type === 'PAYMENT').reduce((s, e) => s.add(e.amount), ZERO)
  const total = order.total
  const clamp = (d: Prisma.Decimal) => Number(d.lt(0) ? ZERO : d)

  if (order.status === 'CANCELLED') return { amountPaid: Number(paid), amountDue: 0, onWallet: 0 }

  switch (order.paymentMode) {
    case 'PAY_FIRST':
      if (order.paymentStatus === 'PAID') return { amountPaid: Number(total), amountDue: 0, onWallet: 0 }
      return { amountPaid: Number(Prisma.Decimal.min(paid, total)), amountDue: clamp(total.sub(paid)), onWallet: 0 }
    case 'PAY_LATER':
      return { amountPaid: Number(Prisma.Decimal.min(paid, total)), amountDue: 0, onWallet: clamp(total.sub(paid)) }
    case 'COD':
    default:
      if (order.status !== 'DELIVERED') return { amountPaid: Number(paid), amountDue: clamp(total.sub(paid)), onWallet: 0 }
      return { amountPaid: Number(Prisma.Decimal.min(paid, total)), amountDue: 0, onWallet: clamp(total.sub(paid)) }
  }
}

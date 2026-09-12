import { Prisma, type Delivery } from '@prisma/client'
import { prisma } from '../../lib/prisma.js'
import { HttpError } from '../../utils/httpError.js'
import type { UpdateDeliveryInput } from './delivery.schemas.js'

export interface PublicDelivery {
  id: string
  orderId: string
  provider: string | null
  trackingRef: string | null
  customerDeliveryCost: number
  actualDeliveryCost: number | null
  /// customerDeliveryCost - actualDeliveryCost. Null until the actual cost is
  /// entered (the order's delivery gain/loss is incomplete until then).
  difference: number | null
  status: Delivery['status']
}

export function toPublicDelivery(d: Delivery): PublicDelivery {
  const customer = Number(d.customerDeliveryCost)
  const actual = d.actualDeliveryCost != null ? Number(d.actualDeliveryCost) : null
  return {
    id: d.id,
    orderId: d.orderId,
    provider: d.provider,
    trackingRef: d.trackingRef,
    customerDeliveryCost: customer,
    actualDeliveryCost: actual,
    difference: actual != null ? customer - actual : null,
    status: d.status,
  }
}

/// Creates the delivery record for an order if it doesn't exist yet, snapshotting
/// the net amount the customer was charged for delivery.
export async function ensureDelivery(orderId: string): Promise<PublicDelivery> {
  const existing = await prisma.delivery.findUnique({ where: { orderId } })
  if (existing) return toPublicDelivery(existing)

  const order = await prisma.order.findUnique({ where: { id: orderId } })
  if (!order) throw HttpError.notFound('Order not found')

  // Net delivery charged to the customer = gross delivery - any delivery discount.
  const netCustomerDelivery = order.customerDeliveryCost.sub(order.deliveryDiscount)
  const created = await prisma.delivery.create({
    data: { orderId, customerDeliveryCost: netCustomerDelivery },
  })
  return toPublicDelivery(created)
}

export async function getByOrder(orderId: string): Promise<PublicDelivery | null> {
  const delivery = await prisma.delivery.findUnique({ where: { orderId } })
  return delivery ? toPublicDelivery(delivery) : null
}

/// Mock third-party dispatch. A real integration (Pathao/pandago) would call the
/// provider's API to create the delivery and return its tracking id; here we
/// simulate that and move the delivery to ASSIGNED. Swap this implementation
/// for the real client without changing callers.
export async function dispatchToProvider(id: string, provider: string): Promise<PublicDelivery> {
  const existing = await prisma.delivery.findUnique({ where: { id } })
  if (!existing) throw HttpError.notFound('Delivery not found')

  const trackingRef = `${provider.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6) || 'PROV'}-${Math.floor(100000 + Math.random() * 900000)}`
  const delivery = await prisma.delivery.update({
    where: { id },
    data: { provider, trackingRef, status: 'ASSIGNED' },
  })
  return toPublicDelivery(delivery)
}

export async function updateDelivery(id: string, input: UpdateDeliveryInput): Promise<PublicDelivery> {
  const existing = await prisma.delivery.findUnique({ where: { id } })
  if (!existing) throw HttpError.notFound('Delivery not found')

  const delivery = await prisma.delivery.update({
    where: { id },
    data: {
      provider: input.provider,
      trackingRef: input.trackingRef,
      actualDeliveryCost:
        input.actualDeliveryCost === undefined
          ? undefined
          : input.actualDeliveryCost === null
            ? null
            : new Prisma.Decimal(input.actualDeliveryCost),
      status: input.status,
    },
  })
  return toPublicDelivery(delivery)
}

export interface DeliveryListRow extends PublicDelivery {
  orderNumber: string
  recipientName: string
  fulfillmentDate: string
}

export async function listDeliveries(): Promise<DeliveryListRow[]> {
  const deliveries = await prisma.delivery.findMany({
    include: { order: true },
    orderBy: { createdAt: 'desc' },
  })
  return deliveries.map((d) => ({
    ...toPublicDelivery(d),
    orderNumber: d.order.orderNumber,
    recipientName: d.order.recipientName,
    fulfillmentDate: d.order.fulfillmentDate.toISOString().slice(0, 10),
  }))
}

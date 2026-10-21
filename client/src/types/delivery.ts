import type { OrderStatus } from './order'

/// The delivery record: who delivers and what it cost. Progress is the order's
/// own status; there is no separate delivery status (vault D-DLV-002).
export interface Delivery {
  id: string
  orderId: string
  provider: string | null
  trackingRef: string | null
  customerDeliveryCost: number
  actualDeliveryCost: number | null
  difference: number | null
}

export interface DeliveryListRow extends Delivery {
  orderNumber: string
  orderStatus: OrderStatus
  dispatchedAt: string | null
  deliveredAt: string | null
  recipientName: string
  fulfillmentDate: string
  timeSlot: string | null
}

export interface DeliveryUpdate {
  provider?: string
  trackingRef?: string
  actualDeliveryCost?: number | null
}

/// Read-only summary shown to customers (no cost details).
export interface DeliverySummary {
  provider: string | null
  trackingRef: string | null
}

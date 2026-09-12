export type DeliveryStatus = 'PENDING' | 'ASSIGNED' | 'PICKED_UP' | 'DELIVERED' | 'FAILED' | 'CANCELLED'

export interface Delivery {
  id: string
  orderId: string
  provider: string | null
  trackingRef: string | null
  customerDeliveryCost: number
  actualDeliveryCost: number | null
  difference: number | null
  status: DeliveryStatus
}

export interface DeliveryListRow extends Delivery {
  orderNumber: string
  recipientName: string
  fulfillmentDate: string
}

export interface DeliveryUpdate {
  provider?: string
  trackingRef?: string
  actualDeliveryCost?: number | null
  status?: DeliveryStatus
}

/// Read-only summary shown to customers (no cost details).
export interface DeliverySummary {
  status: DeliveryStatus
  provider: string | null
  trackingRef: string | null
}

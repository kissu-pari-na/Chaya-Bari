import type { CSSProperties } from 'react'
import { orderTrackerView } from '../lib/orderTracking'
import { orderStatusLabel } from '../lib/orderStatus'
import { useI18n } from '../context/LanguageContext'
import type { OrderStatus, PaymentMode, PaymentStatus } from '../types/order'
import './OrderTracker.css'

interface OrderTrackerProps {
  status: OrderStatus
  paymentStatus: PaymentStatus
  /// Prepaid orders gate on payment before confirmation; cash-on-delivery
  /// orders track the cash payment as the closing milestone instead.
  paymentMode?: PaymentMode
}

/// A visual progress timeline that lets a customer track where their order is
/// in the fulfillment flow. Derives its state from the order + payment status
/// and payment mode, so it stays in sync whenever the order is refetched
/// (including the dedicated payment milestone).
export function OrderTracker({ status, paymentStatus, paymentMode = 'PREPAID' }: OrderTrackerProps) {
  const { t } = useI18n()
  const view = orderTrackerView(status, paymentStatus, paymentMode)

  if (view.cancelled) {
    return (
      <div className="order-tracker order-tracker--cancelled" role="status">
        <div className="order-tracker__cancelled-icon" aria-hidden="true">
          ✕
        </div>
        <div>
          <strong>{t('অর্ডার বাতিল হয়েছে', 'Order cancelled')}</strong>
          <p className="muted">{t('এই অর্ডারটি বাতিল করা হয়েছে।', 'This order has been cancelled.')}</p>
        </div>
      </div>
    )
  }

  const total = view.steps.length
  const progressPct = view.currentIndex <= 0 ? 0 : (view.currentIndex / (total - 1)) * 100

  return (
    <div
      className="order-tracker"
      role="list"
      aria-label={t(`অর্ডার ট্র্যাকিং — বর্তমান অবস্থা: ${orderStatusLabel[status]}`, `Order tracking — current status: ${orderStatusLabel[status]}`)}
      style={{ '--track-progress': `${progressPct}%` } as CSSProperties}
    >
      <div className="order-tracker__rail" aria-hidden="true">
        <div className="order-tracker__rail-fill" />
      </div>
      <ol className="order-tracker__steps">
        {view.steps.map((step) => (
          <li
            key={step.key}
            role="listitem"
            className={`order-tracker__step order-tracker__step--${step.state}`}
            aria-current={step.state === 'current' ? 'step' : undefined}
          >
            <span className="order-tracker__dot" aria-hidden="true">
              {step.state === 'done' ? '✓' : step.icon}
            </span>
            <span className="order-tracker__label">{step.label}</span>
            <span className="order-tracker__desc">{step.description}</span>
          </li>
        ))}
      </ol>
    </div>
  )
}

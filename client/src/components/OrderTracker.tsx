import type { CSSProperties } from 'react'
import { orderTrackerView } from '../lib/orderTracking'
import { formatBdt, formatDateTime } from '../lib/format'
import { useI18n } from '../context/LanguageContext'
import type { DeliverySummary } from '../types/delivery'
import type { OrderStatus, PaymentMode, PaymentStatus } from '../types/order'
import './OrderTracker.css'

interface OrderTrackerProps {
  status: OrderStatus
  paymentStatus: PaymentStatus
  paymentMode: PaymentMode
  amountDue?: number
  readyAt?: string | null
  dispatchedAt?: string | null
  deliveredAt?: string | null
  delivery?: DeliverySummary | null
}

/// The order journey in five steps (Placed → Confirmed → Preparing → On the way
/// → Delivered), the same for every payment method. A banner on top says, in
/// plain words, where the order is and what happens next, including any payment
/// action. Derived purely from the order, so it stays in sync on every refetch.
export function OrderTracker(props: OrderTrackerProps) {
  const { t } = useI18n()
  const view = orderTrackerView({ ...props, formatMoney: formatBdt })

  if (view.cancelled) {
    return (
      <div className="order-tracker order-tracker--cancelled" role="status">
        <div className="order-tracker__cancelled-icon" aria-hidden="true">
          ✕
        </div>
        <div>
          <strong>{t('অর্ডার বাতিল হয়েছে', 'Order cancelled')}</strong>
          <p className="muted">
            {t(
              'এই অর্ডারটি বাতিল করা হয়েছে। পরিশোধিত টাকা থাকলে তা আপনার ওয়ালেটে জমা আছে।',
              'This order was cancelled. Anything you paid is kept as credit in your wallet.',
            )}
          </p>
        </div>
      </div>
    )
  }

  const current = view.steps[view.currentIndex]
  const done = props.status === 'DELIVERED'
  const pct = (view.currentIndex / (view.steps.length - 1)) * 100
  const when =
    props.status === 'DELIVERED' && props.deliveredAt
      ? formatDateTime(props.deliveredAt)
      : props.status === 'OUT_FOR_DELIVERY' && props.dispatchedAt
        ? formatDateTime(props.dispatchedAt)
        : null

  return (
    <div className="order-tracker" style={{ '--track-progress': `${pct}%` } as CSSProperties}>
      <div className={done ? 'order-tracker__now order-tracker__now--done' : 'order-tracker__now'} role="status" aria-live="polite">
        <span className="order-tracker__now-icon" aria-hidden="true">
          {done ? '✓' : current.icon}
        </span>
        <div className="order-tracker__now-text">
          <span className="order-tracker__now-eyebrow">{t('এখন', 'Now')}</span>
          <strong>
            {current.label}
            {props.status === 'PREPARING' && props.readyAt && <> · {t('প্যাকড', 'Packed')}</>}
          </strong>
          <p>
            {current.description}
            {when && <span className="muted"> · {when}</span>}
          </p>
          {view.nextAction && <p className="order-tracker__now-next">{view.nextAction}</p>}
          {props.status === 'OUT_FOR_DELIVERY' && props.delivery?.provider && (
            <p className="order-tracker__now-next">
              {t('ডেলিভারি:', 'Delivery:')} {props.delivery.provider}
              {props.delivery.trackingRef && <> · {props.delivery.trackingRef}</>}
            </p>
          )}
        </div>
      </div>

      <ol className="order-tracker__steps" aria-label={t('অর্ডারের ধাপ', 'Order steps')}>
        <span className="order-tracker__rail" aria-hidden="true">
          <span className="order-tracker__rail-fill" />
        </span>
        {view.steps.map((step) => (
          <li
            key={step.key}
            className={`order-tracker__step order-tracker__step--${step.state}`}
            aria-current={step.state === 'current' ? 'step' : undefined}
          >
            <span className="order-tracker__dot" aria-hidden="true">
              {step.state === 'done' ? '✓' : step.icon}
            </span>
            <span className="order-tracker__label">{step.label}</span>
          </li>
        ))}
      </ol>
    </div>
  )
}

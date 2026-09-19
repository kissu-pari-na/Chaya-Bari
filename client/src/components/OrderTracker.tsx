import type { CSSProperties } from 'react'
import { orderTrackerView } from '../lib/orderTracking'
import { orderStatusLabel } from '../lib/orderStatus'
import { toBnDigits } from '../lib/format'
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

/// A visual progress timeline that lets a customer track where their order is in
/// the fulfillment flow. A prominent "current status" banner up top states, in
/// plain words, exactly what is happening now and what comes next; the timeline
/// below shows the whole journey. Derives its state from the order + payment
/// status and payment mode, so it stays in sync whenever the order is refetched.
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
  const current = view.steps[view.currentIndex]
  // The banner reflects what has actually been REACHED (the milestone texts are
  // written in the past tense, so using the current — not-yet-reached — step
  // would wrongly claim, e.g., "Confirmed" for an order still awaiting admin
  // confirmation). The headline is the furthest completed milestone; `next` is
  // the pending one (what the order is waiting on). When the last step is
  // reached the journey is complete.
  const currentReached = current.reached(status, paymentStatus)
  const complete = view.currentIndex === total - 1 && currentReached
  const doneIndex = currentReached ? view.currentIndex : Math.max(0, view.currentIndex - 1)
  const headline = view.steps[doneIndex]
  const next = complete ? null : current
  const doneCount = currentReached ? total : view.currentIndex
  const progressPct = view.currentIndex <= 0 ? 0 : (view.currentIndex / (total - 1)) * 100

  return (
    <div
      className="order-tracker"
      role="group"
      aria-label={t(`অর্ডার ট্র্যাকিং — বর্তমান অবস্থা: ${orderStatusLabel[status]}`, `Order tracking — current status: ${orderStatusLabel[status]}`)}
      style={{ '--track-progress': `${progressPct}%` } as CSSProperties}
    >
      {/* Plain-language "what's happening now" banner, based on what's reached. */}
      <div className={complete ? 'order-tracker__now order-tracker__now--done' : 'order-tracker__now'}>
        <span className="order-tracker__now-icon" aria-hidden="true">
          {complete ? '✓' : headline.icon}
        </span>
        <div className="order-tracker__now-text">
          <span className="order-tracker__now-eyebrow">{t('বর্তমান অবস্থা', 'Current status')}</span>
          <strong>{headline.label}</strong>
          <p>{headline.description}</p>
          {next && (
            <p className="order-tracker__now-next">
              {t('পরবর্তী ধাপ:', 'Up next:')} {next.label}
            </p>
          )}
        </div>
        <span className="order-tracker__now-step" aria-hidden="true">
          {t('ধাপ', 'Step')} {toBnDigits(doneCount)}/{toBnDigits(total)}
        </span>
      </div>

      <div className="order-tracker__timeline">
        <div className="order-tracker__rail" aria-hidden="true">
          <div className="order-tracker__rail-fill" />
        </div>
        <ol className="order-tracker__steps" role="list">
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
    </div>
  )
}

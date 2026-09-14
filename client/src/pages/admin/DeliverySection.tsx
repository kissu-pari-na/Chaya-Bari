import { useEffect, useState, type FormEvent } from 'react'
import { createOrderDelivery, dispatchDelivery, fetchOrderDelivery, updateDelivery } from '../../lib/delivery'
import { deliveryStatusLabel, deliveryStatuses } from '../../lib/deliveryStatus'
import { formatBdt } from '../../lib/format'
import { ApiError } from '../../lib/apiClient'
import { useI18n } from '../../context/LanguageContext'
import type { Delivery, DeliveryStatus } from '../../types/delivery'
import './Admin.css'

/// Delivery panel embedded in the admin order detail. Exactly two cost values:
/// the customer delivery cost (fixed at checkout) and the actual delivery cost
/// (entered here); the difference is shown, never an estimate.
export function DeliverySection({ orderId }: { orderId: string }) {
  const { t } = useI18n()
  const [delivery, setDelivery] = useState<Delivery | null>(null)
  const [loading, setLoading] = useState(true)
  const [provider, setProvider] = useState('')
  const [trackingRef, setTrackingRef] = useState('')
  const [actualCost, setActualCost] = useState('')
  const [status, setStatus] = useState<DeliveryStatus>('PENDING')
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    fetchOrderDelivery(orderId)
      .then((d) => {
        setDelivery(d)
        if (d) syncForm(d)
      })
      .finally(() => setLoading(false))
  }, [orderId])

  function syncForm(d: Delivery) {
    setProvider(d.provider ?? '')
    setTrackingRef(d.trackingRef ?? '')
    setActualCost(d.actualDeliveryCost != null ? String(d.actualDeliveryCost) : '')
    setStatus(d.status)
  }

  async function handleCreate() {
    setError(null)
    try {
      const d = await createOrderDelivery(orderId)
      setDelivery(d)
      syncForm(d)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('ডেলিভারি তৈরি করা যায়নি', 'Could not create delivery'))
    }
  }

  async function handleDispatch() {
    if (!delivery) return
    setError(null)
    try {
      const d = await dispatchDelivery(delivery.id, provider || 'Pathao')
      setDelivery(d)
      syncForm(d)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('ডিসপ্যাচ করা যায়নি', 'Could not dispatch'))
    }
  }

  async function handleSave(event: FormEvent) {
    event.preventDefault()
    if (!delivery) return
    setError(null)
    setSaved(false)
    try {
      const d = await updateDelivery(delivery.id, {
        provider: provider || undefined,
        trackingRef: trackingRef || undefined,
        actualDeliveryCost: actualCost.trim() === '' ? null : Number(actualCost),
        status,
      })
      setDelivery(d)
      syncForm(d)
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch (err) {
      if (err instanceof ApiError && err.details?.length) setError(err.details.map((x) => x.message).join(' · '))
      else setError(err instanceof ApiError ? err.message : t('সংরক্ষণ করা যায়নি', 'Could not save'))
    }
  }

  if (loading) return <p className="muted">{t('ডেলিভারি লোড হচ্ছে…', 'Loading delivery…')}</p>

  if (!delivery) {
    return (
      <div className="delivery-panel">
        <h3>{t('ডেলিভারি', 'Delivery')}</h3>
        <p className="muted">{t('এই অর্ডারের জন্য এখনো ডেলিভারি তৈরি হয়নি।', 'No delivery has been created for this order yet.')}</p>
        <button className="btn-ghost" onClick={handleCreate}>{t('ডেলিভারি তৈরি করুন', 'Create delivery')}</button>
      </div>
    )
  }

  return (
    <form className="delivery-panel" onSubmit={handleSave}>
      <h3>{t('ডেলিভারি', 'Delivery')}</h3>
      {error && <div className="auth-error">{error}</div>}

      <div className="delivery-costs">
        <div>
          <span className="delivery-costs__label">{t('কাস্টমার ডেলিভারি খরচ', 'Customer delivery cost')}</span>
          <span className="delivery-costs__value">{formatBdt(delivery.customerDeliveryCost)}</span>
        </div>
        <div>
          <span className="delivery-costs__label">{t('প্রকৃত ডেলিভারি খরচ', 'Actual delivery cost')}</span>
          <span className="delivery-costs__value">
            {delivery.actualDeliveryCost != null ? formatBdt(delivery.actualDeliveryCost) : '—'}
          </span>
        </div>
        <div>
          <span className="delivery-costs__label">{t('পার্থক্য', 'Difference')}</span>
          <span
            className={
              delivery.difference == null
                ? 'delivery-costs__value muted'
                : delivery.difference >= 0
                  ? 'delivery-costs__value delivery-gain'
                  : 'delivery-costs__value delivery-loss'
            }
          >
            {delivery.difference == null
              ? t('অসম্পূর্ণ', 'Incomplete')
              : `${delivery.difference >= 0 ? '+' : '−'}${formatBdt(Math.abs(delivery.difference))}`}
          </span>
        </div>
      </div>

      <div className="admin-form__row">
        <label>
          {t('প্রোভাইডার', 'Provider')}
          <input value={provider} onChange={(e) => setProvider(e.target.value)} placeholder="Pathao / pandago…" />
        </label>
        <label>
          {t('ট্র্যাকিং রেফারেন্স', 'Tracking reference')}
          <input value={trackingRef} onChange={(e) => setTrackingRef(e.target.value)} />
        </label>
      </div>
      <div className="admin-form__row">
        <label>
          {t('প্রকৃত ডেলিভারি খরচ (৳)', 'Actual delivery cost (৳)')}
          <input
            type="number"
            min="0"
            step="0.01"
            value={actualCost}
            onChange={(e) => setActualCost(e.target.value)}
            placeholder={t('পরে প্রবেশ করান', 'Enter later')}
          />
        </label>
        <label>
          {t('স্ট্যাটাস', 'Status')}
          <select value={status} onChange={(e) => setStatus(e.target.value as DeliveryStatus)}>
            {deliveryStatuses.map((s) => (
              <option key={s} value={s}>
                {deliveryStatusLabel[s]}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="admin-form__actions">
        <button type="submit">{t('সংরক্ষণ করুন', 'Save')}</button>
        <button type="button" className="btn-ghost" onClick={handleDispatch}>
          {t('প্রোভাইডারে পাঠান (মক)', 'Send to provider (mock)')}
        </button>
        {saved && <span className="hint" style={{ color: '#b07d10', fontWeight: 600 }}>{t('সংরক্ষিত হয়েছে', 'Saved')}</span>}
      </div>
      <p className="hint">{t('প্রোভাইডারে পাঠালে মক ট্র্যাকিং আইডি তৈরি হবে ও স্ট্যাটাস "অ্যাসাইনড" হবে (Pathao/pandago ইন্টিগ্রেশন পয়েন্ট)।', 'Sending to a provider creates a mock tracking ID and sets status to "Assigned" (Pathao/pandago integration point).')}</p>
    </form>
  )
}

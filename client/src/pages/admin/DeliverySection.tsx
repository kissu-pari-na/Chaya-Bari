import { useEffect, useState, type FormEvent } from 'react'
import { createOrderDelivery, fetchOrderDelivery, updateDelivery } from '../../lib/delivery'
import { formatBdt } from '../../lib/format'
import { ApiError } from '../../lib/apiClient'
import { useI18n } from '../../context/LanguageContext'
import type { Delivery } from '../../types/delivery'
import './Admin.css'

/// Delivery details for an order: who delivers it and what it cost. Progress
/// (on the way / delivered) is the order's own status — set from the next-step
/// card — so there is no separate delivery status here (vault D-DLV-002). Two
/// cost values only: what the customer paid and what we paid; the difference is
/// derived, never an estimate.
export function DeliverySection({ orderId, refreshKey }: { orderId: string; refreshKey?: string }) {
  const { t } = useI18n()
  const [delivery, setDelivery] = useState<Delivery | null>(null)
  const [loading, setLoading] = useState(true)
  const [provider, setProvider] = useState('')
  const [trackingRef, setTrackingRef] = useState('')
  const [actualCost, setActualCost] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    fetchOrderDelivery(orderId)
      .then((d) => {
        setDelivery(d)
        if (d) sync(d)
      })
      .finally(() => setLoading(false))
  }, [orderId, refreshKey])

  function sync(d: Delivery) {
    setProvider(d.provider ?? '')
    setTrackingRef(d.trackingRef ?? '')
    setActualCost(d.actualDeliveryCost != null ? String(d.actualDeliveryCost) : '')
  }

  async function save(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSaved(false)
    try {
      const d = delivery ?? (await createOrderDelivery(orderId))
      const updated = await updateDelivery(d.id, {
        provider: provider.trim() || undefined,
        trackingRef: trackingRef.trim() || undefined,
        actualDeliveryCost: actualCost === '' ? null : Number(actualCost),
      })
      setDelivery(updated)
      sync(updated)
      setSaved(true)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('সংরক্ষণ করা যায়নি', 'Could not save'))
    }
  }

  if (loading) return <div className="skeleton" style={{ height: 120 }} />

  return (
    <section className="admin-card">
      <h2>{t('ডেলিভারি', 'Delivery')}</h2>
      {error && <p className="pay-note pay-note--err">{error}</p>}
      <form className="admin-form admin-form--compact" onSubmit={save}>
        <label>
          {t('কে ডেলিভারি করছেন', 'Delivered by')}
          <input value={provider} onChange={(e) => setProvider(e.target.value)} placeholder={t('যেমন: Pathao, রাইডার রহিম', 'e.g. Pathao, rider Rahim')} />
        </label>
        <label>
          {t('ট্র্যাকিং / ফোন', 'Tracking / phone')}
          <input value={trackingRef} onChange={(e) => setTrackingRef(e.target.value)} />
        </label>
        <label>
          {t('আসল ডেলিভারি খরচ (৳)', 'Actual delivery cost (৳)')}
          <input type="number" min={0} step="any" value={actualCost} onChange={(e) => setActualCost(e.target.value)} />
        </label>
        <div className="admin-form__actions">
          <button type="submit" className="btn btn--soft btn--sm">
            {t('সংরক্ষণ', 'Save')}
          </button>
          {saved && <span className="tone-gain">✓ {t('সংরক্ষিত', 'Saved')}</span>}
        </div>
      </form>
      {delivery && (
        <dl className="facts">
          <div>
            <dt>{t('গ্রাহক দিয়েছেন', 'Customer paid')}</dt>
            <dd className="num">{formatBdt(delivery.customerDeliveryCost)}</dd>
          </div>
          <div>
            <dt>{t('আমরা দিয়েছি', 'We paid')}</dt>
            <dd className="num">{delivery.actualDeliveryCost != null ? formatBdt(delivery.actualDeliveryCost) : '—'}</dd>
          </div>
          <div>
            <dt>{t('লাভ/ক্ষতি', 'Gain / loss')}</dt>
            <dd className={delivery.difference == null ? 'num' : delivery.difference >= 0 ? 'num tone-gain' : 'num tone-loss'}>
              {delivery.difference == null ? t('আসল খরচ দিন', 'enter actual cost') : formatBdt(delivery.difference)}
            </dd>
          </div>
        </dl>
      )}
    </section>
  )
}

import { useEffect, useState } from 'react'
import { fetchOrderContribution } from '../../lib/reports'
import { formatBdt } from '../../lib/format'
import { useI18n } from '../../context/LanguageContext'
import type { OrderContribution } from '../../types/reports'
import './Admin.css'

/// Approximate per-order contribution (Section 13). Product cost is from the
/// current recipe cost; delivery gain/loss needs the actual delivery cost.
export function ContributionSection({ orderId, refreshKey }: { orderId: string; refreshKey?: number }) {
  const { t } = useI18n()
  const [c, setC] = useState<OrderContribution | null>(null)

  useEffect(() => {
    fetchOrderContribution(orderId).then(setC).catch(() => setC(null))
  }, [orderId, refreshKey])

  if (!c) return null

  return (
    <div className="delivery-panel">
      <h3>{t('অর্ডার কন্ট্রিবিউশন (আনুমানিক)', 'Order contribution (approx.)')}</h3>
      <div className="profit-grid">
        <div className="profit-line"><span>{t('নেট ফুড সেলস', 'Net food sales')}</span><span>{formatBdt(c.netFoodSales)}</span></div>
        <div className="profit-line"><span>{t('প্রোডাক্ট খরচ', 'Product cost')}</span><span>−{formatBdt(c.productCost)}</span></div>
        <div className="profit-line profit-line--strong"><span>{t('প্রোডাক্ট গ্রস প্রফিট', 'Product gross profit')}</span><span>{formatBdt(c.productGrossProfit)}</span></div>
        <div className="profit-line"><span>{t('কাস্টমার ডেলিভারি', 'Customer delivery')}</span><span>+{formatBdt(c.customerDeliveryCost)}</span></div>
        <div className="profit-line"><span>{t('ডেলিভারি ডিসকাউন্ট', 'Delivery discount')}</span><span>−{formatBdt(c.deliveryDiscount)}</span></div>
        <div className="profit-line">
          <span>{t('প্রকৃত ডেলিভারি খরচ', 'Actual delivery cost')}</span>
          <span>{c.actualDeliveryCost != null ? `−${formatBdt(c.actualDeliveryCost)}` : '—'}</span>
        </div>
        <div className="profit-line profit-line--strong">
          <span>{t('কন্ট্রিবিউশন', 'Contribution')}</span>
          <span style={{ color: c.contribution != null && c.contribution >= 0 ? '#b07d10' : c.contribution != null ? '#b3261e' : undefined }}>
            {c.contribution != null ? formatBdt(c.contribution) : t('অসম্পূর্ণ', 'Incomplete')}
          </span>
        </div>
      </div>
      {!c.complete && (
        <p className="hint" style={{ color: '#b3541e' }}>
          {t('প্রকৃত ডেলিভারি খরচ যোগ করলে চূড়ান্ত কন্ট্রিবিউশন হিসাব হবে।', 'Add the actual delivery cost to compute the final contribution.')}
        </p>
      )}
    </div>
  )
}

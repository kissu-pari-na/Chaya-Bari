import { useEffect, useState } from 'react'
import { fetchOrderContribution } from '../../lib/reports'
import { formatBdt } from '../../lib/format'
import type { OrderContribution } from '../../types/reports'
import './Admin.css'

/// Approximate per-order contribution (Section 13). Product cost is from the
/// current recipe cost; delivery gain/loss needs the actual delivery cost.
export function ContributionSection({ orderId, refreshKey }: { orderId: string; refreshKey?: number }) {
  const [c, setC] = useState<OrderContribution | null>(null)

  useEffect(() => {
    fetchOrderContribution(orderId).then(setC).catch(() => setC(null))
  }, [orderId, refreshKey])

  if (!c) return null

  return (
    <div className="delivery-panel">
      <h3>অর্ডার কন্ট্রিবিউশন (আনুমানিক)</h3>
      <div className="profit-grid">
        <div className="profit-line"><span>নেট ফুড সেলস</span><span>{formatBdt(c.netFoodSales)}</span></div>
        <div className="profit-line"><span>প্রোডাক্ট খরচ</span><span>−{formatBdt(c.productCost)}</span></div>
        <div className="profit-line profit-line--strong"><span>প্রোডাক্ট গ্রস প্রফিট</span><span>{formatBdt(c.productGrossProfit)}</span></div>
        <div className="profit-line"><span>কাস্টমার ডেলিভারি</span><span>+{formatBdt(c.customerDeliveryCost)}</span></div>
        <div className="profit-line"><span>ডেলিভারি ডিসকাউন্ট</span><span>−{formatBdt(c.deliveryDiscount)}</span></div>
        <div className="profit-line">
          <span>প্রকৃত ডেলিভারি খরচ</span>
          <span>{c.actualDeliveryCost != null ? `−${formatBdt(c.actualDeliveryCost)}` : '—'}</span>
        </div>
        <div className="profit-line profit-line--strong">
          <span>কন্ট্রিবিউশন</span>
          <span style={{ color: c.contribution != null && c.contribution >= 0 ? '#1a7a45' : c.contribution != null ? '#b3261e' : undefined }}>
            {c.contribution != null ? formatBdt(c.contribution) : 'অসম্পূর্ণ'}
          </span>
        </div>
      </div>
      {!c.complete && (
        <p className="hint" style={{ color: '#b3541e' }}>
          প্রকৃত ডেলিভারি খরচ যোগ করলে চূড়ান্ত কন্ট্রিবিউশন হিসাব হবে।
        </p>
      )}
    </div>
  )
}

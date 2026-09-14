import { useEffect, useState, useCallback } from 'react'
import { fetchBusinessSummary, fetchProductProfitability } from '../../lib/reports'
import { formatBdt } from '../../lib/format'
import { useI18n } from '../../context/LanguageContext'
import type { BusinessSummary, ProductProfitRow } from '../../types/reports'
import './Admin.css'

function monthStart(): string {
  const d = new Date()
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-01`
}
function today(): string {
  return new Date().toISOString().slice(0, 10)
}

export function ReportsAdmin() {
  const { t } = useI18n()
  const [from, setFrom] = useState(monthStart())
  const [to, setTo] = useState(today())
  const [summary, setSummary] = useState<BusinessSummary | null>(null)
  const [products, setProducts] = useState<ProductProfitRow[]>([])
  const [loading, setLoading] = useState(true)

  const reload = useCallback(async () => {
    setLoading(true)
    try {
      const [s, p] = await Promise.all([fetchBusinessSummary(from, to), fetchProductProfitability(from, to)])
      setSummary(s)
      setProducts(p)
    } finally {
      setLoading(false)
    }
  }, [from, to])

  useEffect(() => {
    void reload()
  }, [reload])

  return (
    <section>
      <h1>{t('ব্যবসায়িক রিপোর্ট ও লাভ', 'Business report & profit')}</h1>

      <div className="order-filters">
        <label className="date-filter">{t('থেকে', 'From')} <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></label>
        <label className="date-filter">{t('পর্যন্ত', 'To')} <input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></label>
      </div>

      {loading || !summary ? (
        <p className="muted">{t('লোড হচ্ছে…', 'Loading…')}</p>
      ) : (
        <>
          <div className="profit-grid">
            <ProfitLine label={t('মোট অর্ডার', 'Total orders')} value={String(summary.totalOrders)} />
            <ProfitLine label={t('ফুড সেলস', 'Food sales')} value={formatBdt(summary.foodSales)} />
            <ProfitLine label={t('ফুড ডিসকাউন্ট', 'Food discounts')} value={`−${formatBdt(summary.foodDiscounts)}`} />
            <ProfitLine label={t('নেট ফুড সেলস', 'Net food sales')} value={formatBdt(summary.netFoodSales)} />
            <ProfitLine label={t('প্রোডাক্ট খরচ', 'Product cost')} value={`−${formatBdt(summary.productCost)}`} />
            <ProfitLine label={t('গ্রস প্রফিট', 'Gross profit')} value={formatBdt(summary.grossProfit)} strong />
            <ProfitLine label={t('ডেলিভারি কালেক্টেড', 'Delivery collected')} value={formatBdt(summary.deliveryCollected)} />
            <ProfitLine label={t('প্রকৃত ডেলিভারি খরচ', 'Actual delivery cost')} value={`−${formatBdt(summary.actualDeliveryCost)}`} />
            <ProfitLine
              label={t('ডেলিভারি লাভ/ক্ষতি', 'Delivery gain/loss')}
              value={`${summary.deliveryGainLoss >= 0 ? '+' : '−'}${formatBdt(Math.abs(summary.deliveryGainLoss))}`}
              tone={summary.deliveryGainLoss >= 0 ? 'gain' : 'loss'}
            />
            <ProfitLine label={t('অন্যান্য খরচ', 'Other expenses')} value={`−${formatBdt(summary.otherExpenses)}`} />
            <ProfitLine
              label={t('নেট প্রফিট', 'Net profit')}
              value={formatBdt(summary.netProfit)}
              strong
              tone={summary.netProfit >= 0 ? 'gain' : 'loss'}
            />
          </div>

          {summary.ordersMissingActualDelivery > 0 && (
            <p className="hint hint--warning" style={{ color: '#b3541e' }}>
              {t(
                `${summary.ordersMissingActualDelivery} টি অর্ডারে প্রকৃত ডেলিভারি খরচ এখনো যোগ হয়নি — ডেলিভারি লাভ/ক্ষতি অসম্পূর্ণ।`,
                `${summary.ordersMissingActualDelivery} order(s) still missing actual delivery cost — delivery gain/loss is incomplete.`,
              )}
            </p>
          )}

          <div className="reports-columns">
            <div>
              <h3>{t('টপ সেলিং', 'Top selling')}</h3>
              <ul className="mini-list">
                {summary.topSelling.map((row) => (
                  <li key={row.productName}>
                    <span>{row.productName}</span>
                    <strong>{row.unitsSold}</strong>
                  </li>
                ))}
                {summary.topSelling.length === 0 && <li className="muted">{t('তথ্য নেই', 'No data')}</li>}
              </ul>
            </div>
            <div>
              <h3>{t('সর্বোচ্চ লাভজনক', 'Most profitable')}</h3>
              <ul className="mini-list">
                {summary.mostProfitable.map((row) => (
                  <li key={row.productName}>
                    <span>{row.productName}</span>
                    <strong>{formatBdt(row.grossProfit)}</strong>
                  </li>
                ))}
                {summary.mostProfitable.length === 0 && <li className="muted">{t('তথ্য নেই', 'No data')}</li>}
              </ul>
            </div>
            <div>
              <h3>{t('টপ কাস্টমার', 'Top customers')}</h3>
              <ul className="mini-list">
                {summary.topCustomers.map((c) => (
                  <li key={c.name}>
                    <span>{c.name} ({c.orders})</span>
                    <strong>{formatBdt(c.spent)}</strong>
                  </li>
                ))}
                {summary.topCustomers.length === 0 && <li className="muted">{t('তথ্য নেই', 'No data')}</li>}
              </ul>
            </div>
            <div>
              <h3>{t('লো-স্টক উপকরণ', 'Low-stock materials')}</h3>
              <ul className="mini-list">
                {summary.lowStockMaterials.map((m) => (
                  <li key={m.name}>
                    <span>{m.name}</span>
                    <strong>{m.stockQty} {m.unit}</strong>
                  </li>
                ))}
                {summary.lowStockMaterials.length === 0 && <li className="muted">{t('তথ্য নেই', 'No data')}</li>}
              </ul>
            </div>
          </div>

          <div className="stat-row" style={{ marginTop: '1rem' }}>
            <div className="stat">
              <span className="stat__label">{t('পেন্ডিং অর্ডার', 'Pending orders')}</span>
              <span className="stat__value">{summary.pendingOrders}</span>
            </div>
            <div className="stat">
              <span className="stat__label">{t('ডেলিভারির অপেক্ষায়', 'Awaiting delivery')}</span>
              <span className="stat__value">{summary.ordersAwaitingDelivery}</span>
            </div>
          </div>

          <h2>{t('প্রোডাক্ট প্রফিটেবিলিটি', 'Product profitability')}</h2>
          <div className="table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>{t('পণ্য', 'Product')}</th>
                  <th>{t('বিক্রি', 'Sold')}</th>
                  <th>{t('রেভিনিউ', 'Revenue')}</th>
                  <th>{t('ডিসকাউন্ট', 'Discount')}</th>
                  <th>{t('নেট', 'Net')}</th>
                  <th>{t('খরচ', 'Cost')}</th>
                  <th>{t('গ্রস প্রফিট', 'Gross profit')}</th>
                  <th>{t('মার্জিন', 'Margin')}</th>
                </tr>
              </thead>
              <tbody>
                {products.map((r) => (
                  <tr key={r.productId ?? r.productName}>
                    <td>{r.productName}</td>
                    <td>{r.unitsSold}</td>
                    <td>{formatBdt(r.revenue)}</td>
                    <td>{formatBdt(r.productDiscount)}</td>
                    <td>{formatBdt(r.netRevenue)}</td>
                    <td>{formatBdt(r.productCost)}</td>
                    <td>{formatBdt(r.grossProfit)}</td>
                    <td>{r.marginPct != null ? `${r.marginPct.toFixed(1)}%` : '—'}</td>
                  </tr>
                ))}
                {products.length === 0 && (
                  <tr>
                    <td colSpan={8} className="muted">{t('এই সময়ে কোনো বিক্রি নেই।', 'No sales in this period.')}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  )
}

function ProfitLine({
  label,
  value,
  strong,
  tone,
}: {
  label: string
  value: string
  strong?: boolean
  tone?: 'gain' | 'loss'
}) {
  const color = tone === 'gain' ? '#b07d10' : tone === 'loss' ? '#b3261e' : undefined
  return (
    <div className={strong ? 'profit-line profit-line--strong' : 'profit-line'}>
      <span>{label}</span>
      <span style={{ color }}>{value}</span>
    </div>
  )
}

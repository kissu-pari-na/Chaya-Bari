import { useEffect, useState, useCallback } from 'react'
import { fetchBusinessSummary, fetchProductProfitability } from '../../lib/reports'
import { formatBdt } from '../../lib/format'
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
      <h1>ব্যবসায়িক রিপোর্ট ও লাভ</h1>

      <div className="order-filters">
        <label className="date-filter">থেকে <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></label>
        <label className="date-filter">পর্যন্ত <input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></label>
      </div>

      {loading || !summary ? (
        <p className="muted">লোড হচ্ছে…</p>
      ) : (
        <>
          <div className="profit-grid">
            <ProfitLine label="মোট অর্ডার" value={String(summary.totalOrders)} />
            <ProfitLine label="ফুড সেলস" value={formatBdt(summary.foodSales)} />
            <ProfitLine label="ফুড ডিসকাউন্ট" value={`−${formatBdt(summary.foodDiscounts)}`} />
            <ProfitLine label="নেট ফুড সেলস" value={formatBdt(summary.netFoodSales)} />
            <ProfitLine label="প্রোডাক্ট খরচ" value={`−${formatBdt(summary.productCost)}`} />
            <ProfitLine label="গ্রস প্রফিট" value={formatBdt(summary.grossProfit)} strong />
            <ProfitLine label="ডেলিভারি কালেক্টেড" value={formatBdt(summary.deliveryCollected)} />
            <ProfitLine label="প্রকৃত ডেলিভারি খরচ" value={`−${formatBdt(summary.actualDeliveryCost)}`} />
            <ProfitLine
              label="ডেলিভারি লাভ/ক্ষতি"
              value={`${summary.deliveryGainLoss >= 0 ? '+' : '−'}${formatBdt(Math.abs(summary.deliveryGainLoss))}`}
              tone={summary.deliveryGainLoss >= 0 ? 'gain' : 'loss'}
            />
            <ProfitLine label="অন্যান্য খরচ" value={`−${formatBdt(summary.otherExpenses)}`} />
            <ProfitLine
              label="নেট প্রফিট"
              value={formatBdt(summary.netProfit)}
              strong
              tone={summary.netProfit >= 0 ? 'gain' : 'loss'}
            />
          </div>

          {summary.ordersMissingActualDelivery > 0 && (
            <p className="hint hint--warning" style={{ color: '#b3541e' }}>
              {summary.ordersMissingActualDelivery} টি অর্ডারে প্রকৃত ডেলিভারি খরচ এখনো যোগ হয়নি — ডেলিভারি লাভ/ক্ষতি অসম্পূর্ণ।
            </p>
          )}

          <div className="reports-columns">
            <div>
              <h3>টপ সেলিং</h3>
              <ul className="mini-list">
                {summary.topSelling.map((t) => (
                  <li key={t.productName}>
                    <span>{t.productName}</span>
                    <strong>{t.unitsSold}</strong>
                  </li>
                ))}
                {summary.topSelling.length === 0 && <li className="muted">তথ্য নেই</li>}
              </ul>
            </div>
            <div>
              <h3>সর্বোচ্চ লাভজনক</h3>
              <ul className="mini-list">
                {summary.mostProfitable.map((t) => (
                  <li key={t.productName}>
                    <span>{t.productName}</span>
                    <strong>{formatBdt(t.grossProfit)}</strong>
                  </li>
                ))}
                {summary.mostProfitable.length === 0 && <li className="muted">তথ্য নেই</li>}
              </ul>
            </div>
            <div>
              <h3>টপ কাস্টমার</h3>
              <ul className="mini-list">
                {summary.topCustomers.map((c) => (
                  <li key={c.name}>
                    <span>{c.name} ({c.orders})</span>
                    <strong>{formatBdt(c.spent)}</strong>
                  </li>
                ))}
                {summary.topCustomers.length === 0 && <li className="muted">তথ্য নেই</li>}
              </ul>
            </div>
            <div>
              <h3>লো-স্টক উপকরণ</h3>
              <ul className="mini-list">
                {summary.lowStockMaterials.map((m) => (
                  <li key={m.name}>
                    <span>{m.name}</span>
                    <strong>{m.stockQty} {m.unit}</strong>
                  </li>
                ))}
                {summary.lowStockMaterials.length === 0 && <li className="muted">তথ্য নেই</li>}
              </ul>
            </div>
          </div>

          <div className="stat-row" style={{ marginTop: '1rem' }}>
            <div className="stat">
              <span className="stat__label">পেন্ডিং অর্ডার</span>
              <span className="stat__value">{summary.pendingOrders}</span>
            </div>
            <div className="stat">
              <span className="stat__label">ডেলিভারির অপেক্ষায়</span>
              <span className="stat__value">{summary.ordersAwaitingDelivery}</span>
            </div>
          </div>

          <h2>প্রোডাক্ট প্রফিটেবিলিটি</h2>
          <div className="table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>পণ্য</th>
                  <th>বিক্রি</th>
                  <th>রেভিনিউ</th>
                  <th>ডিসকাউন্ট</th>
                  <th>নেট</th>
                  <th>খরচ</th>
                  <th>গ্রস প্রফিট</th>
                  <th>মার্জিন</th>
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
                    <td colSpan={8} className="muted">এই সময়ে কোনো বিক্রি নেই।</td>
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
  const color = tone === 'gain' ? '#1a7a45' : tone === 'loss' ? '#b3261e' : undefined
  return (
    <div className={strong ? 'profit-line profit-line--strong' : 'profit-line'}>
      <span>{label}</span>
      <span style={{ color }}>{value}</span>
    </div>
  )
}

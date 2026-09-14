import { useEffect, useState, useCallback } from 'react'
import { fetchCustomerAnalytics, fetchDemandProfit, fetchSalesByDay } from '../../lib/reports'
import { formatBdt } from '../../lib/format'
import type { CustomerAnalyticsRow, DemandProfitRow, ProductQuadrant, SalesByDayRow } from '../../types/reports'
import './Admin.css'

function monthStart(): string {
  const d = new Date()
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-01`
}
function today(): string {
  return new Date().toISOString().slice(0, 10)
}

const quadrantMeta: Record<ProductQuadrant, { title: string; hint: string; color: string }> = {
  BEST: { title: 'বেস্ট (চাহিদা↑ লাভ↑)', hint: 'এগুলো প্রমোট করুন', color: '#c8901a' },
  OPTIMIZE: { title: 'অপ্টিমাইজ (চাহিদা↑ লাভ↓)', hint: 'দাম/খরচ পর্যালোচনা করুন', color: '#b5651d' },
  MARKETING: { title: 'মার্কেটিং সুযোগ (চাহিদা↓ লাভ↑)', hint: 'প্রচার বাড়ান', color: '#1a5b8a' },
  REVIEW: { title: 'পর্যালোচনা (চাহিদা↓ লাভ↓)', hint: 'পরিবর্তন/বাদ দেওয়ার কথা ভাবুন', color: '#b3261e' },
}

export function AnalyticsAdmin() {
  const [from, setFrom] = useState(monthStart())
  const [to, setTo] = useState(today())
  const [days, setDays] = useState<SalesByDayRow[]>([])
  const [demand, setDemand] = useState<DemandProfitRow[]>([])
  const [customers, setCustomers] = useState<CustomerAnalyticsRow[]>([])
  const [loading, setLoading] = useState(true)

  const reload = useCallback(async () => {
    setLoading(true)
    try {
      const [d, dp, c] = await Promise.all([
        fetchSalesByDay(from, to),
        fetchDemandProfit(from, to),
        fetchCustomerAnalytics(from, to),
      ])
      setDays(d)
      setDemand(dp)
      setCustomers(c)
    } finally {
      setLoading(false)
    }
  }, [from, to])

  useEffect(() => {
    void reload()
  }, [reload])

  const quadrants: ProductQuadrant[] = ['BEST', 'OPTIMIZE', 'MARKETING', 'REVIEW']

  return (
    <section>
      <h1>অ্যানালিটিক্স</h1>

      <div className="order-filters">
        <label className="date-filter">থেকে <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></label>
        <label className="date-filter">পর্যন্ত <input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></label>
      </div>

      {loading ? (
        <p className="muted">লোড হচ্ছে…</p>
      ) : (
        <>
          <h2>দৈনিক বিক্রি</h2>
          <div className="table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>তারিখ</th>
                  <th>অর্ডার</th>
                  <th>ফুড সেলস</th>
                  <th>ডিসকাউন্ট</th>
                  <th>নেট</th>
                  <th>ডেলিভারি</th>
                </tr>
              </thead>
              <tbody>
                {days.map((d) => (
                  <tr key={d.date}>
                    <td>{d.date}</td>
                    <td>{d.orders}</td>
                    <td>{formatBdt(d.foodSales)}</td>
                    <td>{formatBdt(d.discounts)}</td>
                    <td>{formatBdt(d.netSales)}</td>
                    <td>{formatBdt(d.deliveryCollected)}</td>
                  </tr>
                ))}
                {days.length === 0 && (
                  <tr>
                    <td colSpan={6} className="muted">এই সময়ে কোনো বিক্রি নেই।</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <h2>চাহিদা × লাভ বিশ্লেষণ</h2>
          <div className="quadrant-grid">
            {quadrants.map((q) => {
              const items = demand.filter((d) => d.quadrant === q)
              const meta = quadrantMeta[q]
              return (
                <div className="quadrant" key={q} style={{ borderTopColor: meta.color }}>
                  <h3 style={{ color: meta.color }}>{meta.title}</h3>
                  <p className="muted small">{meta.hint}</p>
                  <ul className="mini-list">
                    {items.map((d) => (
                      <li key={d.productId ?? d.productName}>
                        <span>{d.productName}</span>
                        <span className="muted">{d.unitsSold} · {formatBdt(d.grossProfit)}</span>
                      </li>
                    ))}
                    {items.length === 0 && <li className="muted">—</li>}
                  </ul>
                </div>
              )
            })}
          </div>

          <h2>কাস্টমার অ্যানালিটিক্স</h2>
          <div className="table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>কাস্টমার</th>
                  <th>অর্ডার</th>
                  <th>মোট খরচ</th>
                  <th>গড় অর্ডার</th>
                  <th>পরিমাণ</th>
                  <th>ছাড়</th>
                  <th>শেষ অর্ডার</th>
                  <th>প্রিয় পণ্য</th>
                  <th>আনু. লাভ</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((c) => (
                  <tr key={c.customerId}>
                    <td>{c.name}</td>
                    <td>{c.totalOrders}</td>
                    <td>{formatBdt(c.totalSpent)}</td>
                    <td>{formatBdt(c.avgOrderValue)}</td>
                    <td>{c.totalQuantity}</td>
                    <td>{formatBdt(c.discountsReceived)}</td>
                    <td>{c.lastOrderDate}</td>
                    <td>{c.topProducts.map((p) => `${p.name} (${p.quantity})`).join(', ') || '—'}</td>
                    <td>{formatBdt(c.approxProfit)}</td>
                  </tr>
                ))}
                {customers.length === 0 && (
                  <tr>
                    <td colSpan={9} className="muted">এই সময়ে কোনো কাস্টমার নেই।</td>
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

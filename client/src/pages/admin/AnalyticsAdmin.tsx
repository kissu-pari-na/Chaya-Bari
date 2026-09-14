import { useEffect, useState, useCallback } from 'react'
import { fetchCustomerAnalytics, fetchDemandProfit, fetchSalesByDay } from '../../lib/reports'
import { formatBdt } from '../../lib/format'
import { useI18n } from '../../context/LanguageContext'
import { pick } from '../../lib/i18n'
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
  BEST: {
    get title() {
      return pick('বেস্ট (চাহিদা↑ লাভ↑)', 'Best (demand↑ profit↑)')
    },
    get hint() {
      return pick('এগুলো প্রমোট করুন', 'Promote these')
    },
    color: '#c8901a',
  },
  OPTIMIZE: {
    get title() {
      return pick('অপ্টিমাইজ (চাহিদা↑ লাভ↓)', 'Optimize (demand↑ profit↓)')
    },
    get hint() {
      return pick('দাম/খরচ পর্যালোচনা করুন', 'Review price/cost')
    },
    color: '#b5651d',
  },
  MARKETING: {
    get title() {
      return pick('মার্কেটিং সুযোগ (চাহিদা↓ লাভ↑)', 'Marketing opportunity (demand↓ profit↑)')
    },
    get hint() {
      return pick('প্রচার বাড়ান', 'Increase promotion')
    },
    color: '#1a5b8a',
  },
  REVIEW: {
    get title() {
      return pick('পর্যালোচনা (চাহিদা↓ লাভ↓)', 'Review (demand↓ profit↓)')
    },
    get hint() {
      return pick('পরিবর্তন/বাদ দেওয়ার কথা ভাবুন', 'Consider changing/dropping')
    },
    color: '#b3261e',
  },
}

export function AnalyticsAdmin() {
  const { t } = useI18n()
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
      <h1>{t('অ্যানালিটিক্স', 'Analytics')}</h1>

      <div className="order-filters">
        <label className="date-filter">{t('থেকে', 'From')} <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></label>
        <label className="date-filter">{t('পর্যন্ত', 'To')} <input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></label>
      </div>

      {loading ? (
        <p className="muted">{t('লোড হচ্ছে…', 'Loading…')}</p>
      ) : (
        <>
          <h2>{t('দৈনিক বিক্রি', 'Daily sales')}</h2>
          <div className="table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>{t('তারিখ', 'Date')}</th>
                  <th>{t('অর্ডার', 'Orders')}</th>
                  <th>{t('ফুড সেলস', 'Food sales')}</th>
                  <th>{t('ডিসকাউন্ট', 'Discount')}</th>
                  <th>{t('নেট', 'Net')}</th>
                  <th>{t('ডেলিভারি', 'Delivery')}</th>
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
                    <td colSpan={6} className="muted">{t('এই সময়ে কোনো বিক্রি নেই।', 'No sales in this period.')}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <h2>{t('চাহিদা × লাভ বিশ্লেষণ', 'Demand × profit analysis')}</h2>
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

          <h2>{t('কাস্টমার অ্যানালিটিক্স', 'Customer analytics')}</h2>
          <div className="table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>{t('কাস্টমার', 'Customer')}</th>
                  <th>{t('অর্ডার', 'Orders')}</th>
                  <th>{t('মোট খরচ', 'Total spent')}</th>
                  <th>{t('গড় অর্ডার', 'Avg order')}</th>
                  <th>{t('পরিমাণ', 'Quantity')}</th>
                  <th>{t('ছাড়', 'Discount')}</th>
                  <th>{t('শেষ অর্ডার', 'Last order')}</th>
                  <th>{t('প্রিয় পণ্য', 'Favorite products')}</th>
                  <th>{t('আনু. লাভ', 'Approx. profit')}</th>
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
                    <td colSpan={9} className="muted">{t('এই সময়ে কোনো কাস্টমার নেই।', 'No customers in this period.')}</td>
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

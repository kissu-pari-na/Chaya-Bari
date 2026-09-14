import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchMyOrders } from '../lib/orders'
import { formatBdt, toBnDigits } from '../lib/format'
import { orderStatusLabel } from '../lib/orderStatus'
import { useI18n } from '../context/LanguageContext'
import type { Order } from '../types/order'
import './Orders.css'

export function MyOrders() {
  const { t } = useI18n()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    fetchMyOrders()
      .then(setOrders)
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <p className="muted">{t('লোড হচ্ছে…', 'Loading…')}</p>

  return (
    <section>
      <span className="eyebrow">{t('আপনার অর্ডার ইতিহাস', 'Your order history')}</span>
      <h1 className="myorders-title">{t('আমার অর্ডার', 'My Orders')}</h1>
      {error && <p className="muted">{t('অর্ডার লোড করা যায়নি', 'Could not load orders')}</p>}
      {!error && orders.length === 0 && (
        <div className="orders-empty">
          <div className="orders-empty__icon" aria-hidden="true">🧺</div>
          <p>{t('এখনো কোনো অর্ডার নেই।', 'No orders yet.')}</p>
          <Link to="/products" className="btn btn--primary">
            {t('অর্ডার শুরু করুন', 'Start ordering')}
          </Link>
        </div>
      )}
      <div className="order-list">
        {orders.map((o) => {
          const count = o.items.reduce((s, i) => s + i.quantity, 0)
          const preview = o.items.map((i) => i.productName).slice(0, 2).join(', ')
          return (
            <Link key={o.id} to={`/orders/${o.id}`} className="order-row">
              <div className="order-row__main">
                <div className="order-row__top">
                  <strong className="order-row__num">{o.orderNumber}</strong>
                  <span className={`status status--${o.status.toLowerCase()}`}>{orderStatusLabel[o.status]}</span>
                </div>
                <div className="order-row__sub">
                  <span>📅 {o.fulfillmentDate}</span>
                  <span>· {toBnDigits(count)} {t('আইটেম', 'items')}</span>
                  {preview && <span className="order-row__preview">· {preview}{o.items.length > 2 ? '…' : ''}</span>}
                  {o.status === 'DELIVERED' && <span className="order-row__review">⭐ {t('রিভিউ দিন', 'Leave a review')}</span>}
                </div>
              </div>
              <div className="order-row__meta">
                <strong className="order-row__total">{formatBdt(o.total)}</strong>
                <span className="order-row__chev" aria-hidden="true">→</span>
              </div>
            </Link>
          )
        })}
      </div>
    </section>
  )
}

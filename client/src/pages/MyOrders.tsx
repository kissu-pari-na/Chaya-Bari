import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchMyOrders } from '../lib/orders'
import { formatBdt } from '../lib/format'
import { orderStatusLabel } from '../lib/orderStatus'
import type { Order } from '../types/order'
import './Orders.css'

export function MyOrders() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchMyOrders()
      .then(setOrders)
      .catch(() => setError('অর্ডার লোড করা যায়নি'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <p className="muted">লোড হচ্ছে…</p>

  return (
    <section>
      <span className="eyebrow">আপনার অর্ডার ইতিহাস</span>
      <h1 className="myorders-title">আমার অর্ডার</h1>
      {error && <p className="muted">{error}</p>}
      {!error && orders.length === 0 && (
        <div className="orders-empty">
          <div className="orders-empty__icon" aria-hidden="true">🧺</div>
          <p>এখনো কোনো অর্ডার নেই।</p>
          <Link to="/products" className="btn btn--primary">
            অর্ডার শুরু করুন
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
                  <span>· {count.toLocaleString('bn-BD')} আইটেম</span>
                  {preview && <span className="order-row__preview">· {preview}{o.items.length > 2 ? '…' : ''}</span>}
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

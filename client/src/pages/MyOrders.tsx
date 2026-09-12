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
      <h1>আমার অর্ডার</h1>
      {error && <p className="muted">{error}</p>}
      {!error && orders.length === 0 && (
        <div className="card">
          <p className="muted">এখনো কোনো অর্ডার নেই।</p>
          <Link to="/products">অর্ডার করুন →</Link>
        </div>
      )}
      <div className="order-list">
        {orders.map((o) => (
          <Link key={o.id} to={`/orders/${o.id}`} className="order-row">
            <div>
              <strong>{o.orderNumber}</strong>
              <span className="muted"> · {o.fulfillmentDate}</span>
            </div>
            <div className="order-row__meta">
              <span className={`status status--${o.status.toLowerCase()}`}>{orderStatusLabel[o.status]}</span>
              <strong>{formatBdt(o.total)}</strong>
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}

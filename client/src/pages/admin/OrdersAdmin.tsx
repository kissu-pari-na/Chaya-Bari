import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { fetchAdminOrders, type OrderFilters } from '../../lib/orders'
import { formatBdt } from '../../lib/format'
import { orderStatusLabel, paymentStatusLabel } from '../../lib/orderStatus'
import { orderStatuses, paymentStatuses } from '../../lib/orderEnums'
import type { AdminOrder } from '../../types/order'
import '../Orders.css'
import './Admin.css'

export function OrdersAdmin() {
  const [orders, setOrders] = useState<AdminOrder[]>([])
  const [filters, setFilters] = useState<OrderFilters>({})
  const [loading, setLoading] = useState(true)

  const load = useCallback(async (f: OrderFilters) => {
    setLoading(true)
    try {
      setOrders(await fetchAdminOrders(f))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load(filters)
  }, [load, filters])

  return (
    <section>
      <h1>অর্ডার ব্যবস্থাপনা</h1>

      <div className="order-filters">
        <input
          placeholder="খুঁজুন (নাম, নম্বর, ইমেইল)"
          value={filters.search ?? ''}
          onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value || undefined }))}
        />
        <select
          value={filters.status ?? ''}
          onChange={(e) => setFilters((f) => ({ ...f, status: (e.target.value || undefined) as OrderFilters['status'] }))}
        >
          <option value="">সব স্ট্যাটাস</option>
          {orderStatuses.map((s) => (
            <option key={s} value={s}>
              {orderStatusLabel[s]}
            </option>
          ))}
        </select>
        <select
          value={filters.paymentStatus ?? ''}
          onChange={(e) =>
            setFilters((f) => ({ ...f, paymentStatus: (e.target.value || undefined) as OrderFilters['paymentStatus'] }))
          }
        >
          <option value="">সব পেমেন্ট</option>
          {paymentStatuses.map((s) => (
            <option key={s} value={s}>
              {paymentStatusLabel[s]}
            </option>
          ))}
        </select>
        <label className="date-filter">
          থেকে
          <input
            type="date"
            value={filters.fromDate ?? ''}
            onChange={(e) => setFilters((f) => ({ ...f, fromDate: e.target.value || undefined }))}
          />
        </label>
        <label className="date-filter">
          পর্যন্ত
          <input
            type="date"
            value={filters.toDate ?? ''}
            onChange={(e) => setFilters((f) => ({ ...f, toDate: e.target.value || undefined }))}
          />
        </label>
      </div>

      {loading ? (
        <p className="muted">লোড হচ্ছে…</p>
      ) : (
        <div className="table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>অর্ডার</th>
                <th>গ্রাহক</th>
                <th>ডেলিভারি</th>
                <th>মোট</th>
                <th>স্ট্যাটাস</th>
                <th>পেমেন্ট</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id}>
                  <td>
                    <Link to={`/admin/orders/${o.id}`}>{o.orderNumber}</Link>
                  </td>
                  <td>{o.customer.name}</td>
                  <td>{o.fulfillmentDate}</td>
                  <td>{formatBdt(o.total)}</td>
                  <td>
                    <span className={`status status--${o.status.toLowerCase()}`}>{orderStatusLabel[o.status]}</span>
                  </td>
                  <td>
                    <span className="status status--payment">{paymentStatusLabel[o.paymentStatus]}</span>
                  </td>
                </tr>
              ))}
              {orders.length === 0 && (
                <tr>
                  <td colSpan={6} className="muted">
                    কোনো অর্ডার নেই।
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

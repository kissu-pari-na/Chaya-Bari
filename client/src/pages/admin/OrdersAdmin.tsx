import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { fetchAdminOrders, type OrderFilters } from '../../lib/orders'
import { formatBdt } from '../../lib/format'
import { orderStatusLabel, paymentStatusLabel } from '../../lib/orderStatus'
import { formatSlotValue } from '../../lib/slots'
import { orderStatuses, paymentStatuses } from '../../lib/orderEnums'
import { useI18n } from '../../context/LanguageContext'
import type { AdminOrder } from '../../types/order'
import '../Orders.css'
import './Admin.css'

export function OrdersAdmin() {
  const { t } = useI18n()
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
      <h1>{t('অর্ডার ব্যবস্থাপনা', 'Order management')}</h1>

      <div className="order-filters">
        <input
          placeholder={t('খুঁজুন (নাম, নম্বর, ইমেইল)', 'Search (name, number, email)')}
          value={filters.search ?? ''}
          onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value || undefined }))}
        />
        <select
          value={filters.status ?? ''}
          onChange={(e) => setFilters((f) => ({ ...f, status: (e.target.value || undefined) as OrderFilters['status'] }))}
        >
          <option value="">{t('সব স্ট্যাটাস', 'All statuses')}</option>
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
          <option value="">{t('সব পেমেন্ট', 'All payments')}</option>
          {paymentStatuses.map((s) => (
            <option key={s} value={s}>
              {paymentStatusLabel[s]}
            </option>
          ))}
        </select>
        <label className="date-filter">
          {t('থেকে', 'From')}
          <input
            type="date"
            value={filters.fromDate ?? ''}
            onChange={(e) => setFilters((f) => ({ ...f, fromDate: e.target.value || undefined }))}
          />
        </label>
        <label className="date-filter">
          {t('পর্যন্ত', 'To')}
          <input
            type="date"
            value={filters.toDate ?? ''}
            onChange={(e) => setFilters((f) => ({ ...f, toDate: e.target.value || undefined }))}
          />
        </label>
      </div>

      {loading ? (
        <p className="muted">{t('লোড হচ্ছে…', 'Loading…')}</p>
      ) : (
        <div className="table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>{t('অর্ডার', 'Order')}</th>
                <th>{t('গ্রাহক', 'Customer')}</th>
                <th>{t('ডেলিভারি', 'Delivery')}</th>
                <th>{t('মোট', 'Total')}</th>
                <th>{t('স্ট্যাটাস', 'Status')}</th>
                <th>{t('পেমেন্ট', 'Payment')}</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id}>
                  <td>
                    <Link to={`/admin/orders/${o.id}`}>{o.orderNumber}</Link>
                  </td>
                  <td>
                    {o.customer.name}
                    {o.customer.isGuest && <><br /><span className="muted small">{t('অতিথি', 'Guest')}</span></>}
                  </td>
                  <td>
                    {o.fulfillmentDate}
                    {o.timeSlot && <><br /><span className="muted">{formatSlotValue(o.timeSlot)}</span></>}
                  </td>
                  <td>{formatBdt(o.total)}</td>
                  <td>
                    <span className={`status status--${o.status.toLowerCase()}`}>{orderStatusLabel[o.status]}</span>
                  </td>
                  <td>
                    <span className="status status--payment">{paymentStatusLabel[o.paymentStatus]}</span>
                    {o.paymentMode === 'COD' && (
                      <><br /><span className="status status--cod">{t('ক্যাশ অন ডেলিভারি', 'COD')}</span></>
                    )}
                  </td>
                </tr>
              ))}
              {orders.length === 0 && (
                <tr>
                  <td colSpan={6} className="muted">
                    {t('কোনো অর্ডার নেই।', 'No orders.')}
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

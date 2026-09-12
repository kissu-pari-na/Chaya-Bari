import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  fetchAdminOrder,
  updateOrderPaymentStatus,
  updateOrderStatus,
} from '../../lib/orders'
import { formatBdt } from '../../lib/format'
import { orderStatusLabel, paymentStatusLabel } from '../../lib/orderStatus'
import { nextStatuses, paymentStatuses } from '../../lib/orderEnums'
import { ApiError } from '../../lib/apiClient'
import { DeliverySection } from './DeliverySection'
import { PaymentsSection } from './PaymentsSection'
import type { AdminOrder, PaymentStatus } from '../../types/order'
import '../Orders.css'
import './Admin.css'

export function OrderDetailAdmin() {
  const { id } = useParams<{ id: string }>()
  const [order, setOrder] = useState<AdminOrder | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!id) return
    fetchAdminOrder(id)
      .then(setOrder)
      .catch(() => setError('অর্ডারটি পাওয়া যায়নি'))
      .finally(() => setLoading(false))
  }, [id])

  async function changeStatus(status: AdminOrder['status']) {
    if (!order) return
    setBusy(true)
    setError(null)
    try {
      setOrder(await updateOrderStatus(order.id, status))
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'স্ট্যাটাস পরিবর্তন করা যায়নি')
    } finally {
      setBusy(false)
    }
  }

  async function changePayment(paymentStatus: PaymentStatus) {
    if (!order) return
    setBusy(true)
    setError(null)
    try {
      setOrder(await updateOrderPaymentStatus(order.id, paymentStatus))
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'পেমেন্ট স্ট্যাটাস পরিবর্তন করা যায়নি')
    } finally {
      setBusy(false)
    }
  }

  if (loading) return <p className="muted">লোড হচ্ছে…</p>
  if (error && !order) return <div className="card"><p className="muted">{error}</p></div>
  if (!order) return null

  return (
    <section>
      <Link to="/admin/orders" className="product-detail__back">← সব অর্ডার</Link>
      <div className="card order-detail">
        {error && <div className="auth-error">{error}</div>}
        <div className="order-detail__head">
          <div>
            <h1>অর্ডার {order.orderNumber}</h1>
            <p className="muted">ডেলিভারির তারিখ: {order.fulfillmentDate}</p>
          </div>
          <div className="order-detail__badges">
            <span className={`status status--${order.status.toLowerCase()}`}>{orderStatusLabel[order.status]}</span>
            <span className="status status--payment">পেমেন্ট: {paymentStatusLabel[order.paymentStatus]}</span>
          </div>
        </div>

        <div className="admin-order-controls">
          <div>
            <span className="control-label">স্ট্যাটাস পরিবর্তন:</span>
            {nextStatuses[order.status].length === 0 && <span className="muted"> (চূড়ান্ত)</span>}
            {nextStatuses[order.status].map((s) => (
              <button key={s} className="btn-ghost" disabled={busy} onClick={() => changeStatus(s)}>
                {orderStatusLabel[s]}
              </button>
            ))}
          </div>
          <div>
            <span className="control-label">পেমেন্ট:</span>
            <select
              value={order.paymentStatus}
              disabled={busy}
              onChange={(e) => changePayment(e.target.value as PaymentStatus)}
            >
              {paymentStatuses.map((s) => (
                <option key={s} value={s}>
                  {paymentStatusLabel[s]}
                </option>
              ))}
            </select>
          </div>
        </div>

        <table className="document-table">
          <thead>
            <tr>
              <th>আইটেম</th>
              <th>পরিমাণ</th>
              <th>একক মূল্য</th>
              <th>মোট</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((i) => (
              <tr key={i.id}>
                <td>{i.productName}</td>
                <td>{i.quantity}</td>
                <td>
                  {formatBdt(i.unitPrice)}
                  {i.listUnitPrice > i.unitPrice && <s className="product-card__was"> {formatBdt(i.listUnitPrice)}</s>}
                </td>
                <td>{formatBdt(i.lineTotal)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={3}>সাবটোটাল</td>
              <td>{formatBdt(order.subtotal)}</td>
            </tr>
            {order.productDiscount > 0 && (
              <tr>
                <td colSpan={3}>ফুড ডিসকাউন্ট{order.couponCode ? ` (${order.couponCode})` : ''}</td>
                <td>−{formatBdt(order.productDiscount)}</td>
              </tr>
            )}
            <tr>
              <td colSpan={3}>ডেলিভারি চার্জ</td>
              <td>{formatBdt(order.customerDeliveryCost)}</td>
            </tr>
            {order.deliveryDiscount > 0 && (
              <tr>
                <td colSpan={3}>ডেলিভারি ডিসকাউন্ট</td>
                <td>−{formatBdt(order.deliveryDiscount)}</td>
              </tr>
            )}
            <tr>
              <td colSpan={3}>সর্বমোট</td>
              <td>
                <strong>{formatBdt(order.total)}</strong>
              </td>
            </tr>
          </tfoot>
        </table>

        <PaymentsSection order={order} onOrderChange={setOrder} />

        <DeliverySection orderId={order.id} />

        <div className="order-detail__address">
          <h3>গ্রাহক ও ঠিকানা</h3>
          <p>
            {order.customer.name} · {order.customer.email}
            {order.customer.phone ? ` · ${order.customer.phone}` : ''}
          </p>
          <p>
            {order.recipientName} · {order.recipientPhone}
            <br />
            {order.addressLine}
            {order.area ? `, ${order.area}` : ''}, {order.city}
          </p>
          {order.notes && <p className="muted">নোট: {order.notes}</p>}
        </div>
      </div>
    </section>
  )
}

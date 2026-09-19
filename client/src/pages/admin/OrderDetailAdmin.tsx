import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  fetchAdminOrder,
  updateOrderPaymentStatus,
  updateOrderStatus,
} from '../../lib/orders'
import { formatBdt, formatDateWithDay } from '../../lib/format'
import { orderStatusLabel, paymentStatusLabel } from '../../lib/orderStatus'
import { formatSlotValue } from '../../lib/slots'
import { nextStatuses, paymentStatuses } from '../../lib/orderEnums'
import { ApiError } from '../../lib/apiClient'
import { useI18n } from '../../context/LanguageContext'
import { DeliverySection } from './DeliverySection'
import { PaymentsSection } from './PaymentsSection'
import { ContributionSection } from './ContributionSection'
import type { AdminOrder, PaymentStatus } from '../../types/order'
import '../Orders.css'
import './Admin.css'

export function OrderDetailAdmin() {
  const { t } = useI18n()
  const { id } = useParams<{ id: string }>()
  const [order, setOrder] = useState<AdminOrder | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!id) return
    fetchAdminOrder(id)
      .then(setOrder)
      .catch(() => setError(t('অর্ডারটি পাওয়া যায়নি', 'Order not found')))
      .finally(() => setLoading(false))
  }, [id])

  async function changeStatus(status: AdminOrder['status']) {
    if (!order) return
    setBusy(true)
    setError(null)
    try {
      setOrder(await updateOrderStatus(order.id, status))
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('স্ট্যাটাস পরিবর্তন করা যায়নি', 'Could not change status'))
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
      setError(err instanceof ApiError ? err.message : t('পেমেন্ট স্ট্যাটাস পরিবর্তন করা যায়নি', 'Could not change payment status'))
    } finally {
      setBusy(false)
    }
  }

  if (loading) return <p className="muted">{t('লোড হচ্ছে…', 'Loading…')}</p>
  if (error && !order) return <div className="card"><p className="muted">{error}</p></div>
  if (!order) return null

  return (
    <section>
      <Link to="/admin/orders" className="product-detail__back">← {t('সব অর্ডার', 'All orders')}</Link>
      <div className="card order-detail">
        {error && <div className="auth-error">{error}</div>}
        <div className="order-detail__head">
          <div>
            <h1>{t('অর্ডার', 'Order')} {order.orderNumber}</h1>
            <p className="muted">
              {t('ডেলিভারির তারিখ:', 'Delivery date:')} {formatDateWithDay(order.fulfillmentDate)}
              {order.timeSlot && <> · {t('সময়:', 'Time:')} {formatSlotValue(order.timeSlot)}</>}
            </p>
          </div>
          <div className="order-detail__badges">
            <span className={`status status--${order.status.toLowerCase()}`}>{orderStatusLabel[order.status]}</span>
            <span className="status status--payment">{t('পেমেন্ট:', 'Payment:')} {paymentStatusLabel[order.paymentStatus]}</span>
            {order.paymentMode === 'COD' && (
              <span className="status status--cod">{t('ক্যাশ অন ডেলিভারি', 'Cash on delivery')}</span>
            )}
          </div>
        </div>

        <div className="admin-order-controls">
          <div>
            <span className="control-label">{t('স্ট্যাটাস পরিবর্তন:', 'Change status:')}</span>
            {nextStatuses[order.status].length === 0 && <span className="muted"> {t('(চূড়ান্ত)', '(final)')}</span>}
            {nextStatuses[order.status].map((s) => (
              <button key={s} className="btn-ghost" disabled={busy} onClick={() => changeStatus(s)}>
                {orderStatusLabel[s]}
              </button>
            ))}
          </div>
          <div>
            <span className="control-label">{t('পেমেন্ট:', 'Payment:')}</span>
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
              <th>{t('আইটেম', 'Item')}</th>
              <th>{t('পরিমাণ', 'Qty')}</th>
              <th>{t('একক মূল্য', 'Unit price')}</th>
              <th>{t('মোট', 'Total')}</th>
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
              <td colSpan={3}>{t('সাবটোটাল', 'Subtotal')}</td>
              <td>{formatBdt(order.subtotal)}</td>
            </tr>
            {order.productDiscount > 0 && (
              <tr>
                <td colSpan={3}>{t('ফুড ডিসকাউন্ট', 'Food discount')}{order.couponCode ? ` (${order.couponCode})` : ''}</td>
                <td>−{formatBdt(order.productDiscount)}</td>
              </tr>
            )}
            <tr>
              <td colSpan={3}>{t('ডেলিভারি চার্জ', 'Delivery charge')}</td>
              <td>{formatBdt(order.customerDeliveryCost)}</td>
            </tr>
            {order.deliveryDiscount > 0 && (
              <tr>
                <td colSpan={3}>{t('ডেলিভারি ডিসকাউন্ট', 'Delivery discount')}</td>
                <td>−{formatBdt(order.deliveryDiscount)}</td>
              </tr>
            )}
            <tr>
              <td colSpan={3}>{t('সর্বমোট', 'Grand total')}</td>
              <td>
                <strong>{formatBdt(order.total)}</strong>
              </td>
            </tr>
          </tfoot>
        </table>

        <PaymentsSection order={order} onOrderChange={setOrder} />

        <DeliverySection orderId={order.id} />

        <ContributionSection orderId={order.id} />

        <div className="order-detail__address">
          <h3>{t('গ্রাহক ও ঠিকানা', 'Customer & address')}</h3>
          <p>
            {order.customer.name}
            {order.customer.email ? ` · ${order.customer.email}` : ''}
            {order.customer.phone ? ` · ${order.customer.phone}` : ''}
            {order.customer.isGuest && (
              <span className="status status--cod" style={{ marginLeft: '0.5rem' }}>{t('অতিথি', 'Guest')}</span>
            )}
          </p>
          <p>
            {order.recipientName} · {order.recipientPhone}
            <br />
            {order.addressLine}
            {order.area ? `, ${order.area}` : ''}, {order.city}
          </p>
          {order.notes && <p className="muted">{t('নোট:', 'Note:')} {order.notes}</p>}
        </div>
      </div>
    </section>
  )
}

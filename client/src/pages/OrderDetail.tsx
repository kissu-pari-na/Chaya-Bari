import { useEffect, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { cancelMyOrder, changeOrderPaymentMode, fetchMyOrder } from '../lib/orders'
import { formatBdt, formatDateWithDay } from '../lib/format'
import { orderStatusLabel, paymentStatusLabel } from '../lib/orderStatus'
import { formatSlotValue } from '../lib/slots'
import { deliveryStatusLabel } from '../lib/deliveryStatus'
import { ApiError } from '../lib/apiClient'
import { usePoll } from '../lib/usePoll'
import { DocumentHeader } from '../components/DocumentHeader'
import { OrderTracker } from '../components/OrderTracker'
import { useI18n } from '../context/LanguageContext'
import { PaymentPanel } from './PaymentPanel'
import type { Order } from '../types/order'
import './Orders.css'

export function OrderDetail() {
  const { t } = useI18n()
  const { id } = useParams<{ id: string }>()
  const location = useLocation()
  const justPlaced = (location.state as { justPlaced?: boolean } | null)?.justPlaced
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [modeBusy, setModeBusy] = useState(false)
  const [modeError, setModeError] = useState<string | null>(null)
  const [cancelBusy, setCancelBusy] = useState(false)
  const [cancelError, setCancelError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    fetchMyOrder(id)
      .then(setOrder)
      .catch(() => setError('__NOT_FOUND__'))
      .finally(() => setLoading(false))
  }, [id])

  // Live updates: quietly refetch the order so status/tracker/payment reflect
  // admin actions (confirm, prepare, deliver, verify a payment…) without a
  // manual refresh. Paused while the customer is mid-action or the order is in a
  // terminal state.
  usePoll(
    () => {
      if (id && !cancelBusy && !modeBusy) fetchMyOrder(id).then(setOrder).catch(() => {})
    },
    15000,
    !!id && !!order && order.status !== 'CANCELLED',
  )

  async function switchPaymentMode(target: 'PREPAID' | 'COD') {
    if (!order) return
    setModeBusy(true)
    setModeError(null)
    try {
      setOrder(await changeOrderPaymentMode(order.id, target))
    } catch (err) {
      setModeError(err instanceof ApiError ? err.message : t('পরিবর্তন করা যায়নি', 'Could not change payment method'))
    } finally {
      setModeBusy(false)
    }
  }

  async function handleCancel() {
    if (!order) return
    if (!window.confirm(t('আপনি কি নিশ্চিত এই অর্ডারটি বাতিল করতে চান?', 'Are you sure you want to cancel this order?'))) return
    setCancelBusy(true)
    setCancelError(null)
    try {
      setOrder(await cancelMyOrder(order.id))
    } catch (err) {
      setCancelError(err instanceof ApiError ? err.message : t('অর্ডার বাতিল করা যায়নি', 'Could not cancel the order'))
    } finally {
      setCancelBusy(false)
    }
  }

  if (loading) return <p className="muted">{t('লোড হচ্ছে…', 'Loading…')}</p>
  if (error || !order)
    return (
      <div className="paper">
        <p className="muted">{t('অর্ডারটি পাওয়া যায়নি', 'Order not found')}</p>
        <Link to="/orders">← {t('আমার অর্ডার', 'My Orders')}</Link>
      </div>
    )

  return (
    <section className="paper order-detail">
      {justPlaced && <div className="order-placed">✓ {t('আপনার অর্ডার সফলভাবে গ্রহণ করা হয়েছে!', 'Your order was placed successfully!')}</div>}
      <DocumentHeader />

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

      <OrderTracker status={order.status} paymentStatus={order.paymentStatus} paymentMode={order.paymentMode} />

      {order.status === 'PENDING' && (
        <div className="pay-mode-switch">
          <div>
            <strong>{t('পেমেন্ট পদ্ধতি', 'Payment method')}:</strong>{' '}
            {order.paymentMode === 'COD' ? t('ক্যাশ অন ডেলিভারি', 'Cash on delivery') : t('অগ্রিম পেমেন্ট', 'Pay in advance')}
          </div>
          <button
            type="button"
            className="btn btn--sm"
            disabled={modeBusy}
            onClick={() => switchPaymentMode(order.paymentMode === 'COD' ? 'PREPAID' : 'COD')}
          >
            {order.paymentMode === 'COD'
              ? t('অগ্রিম পেমেন্টে পরিবর্তন করুন', 'Switch to pay in advance')
              : t('ক্যাশ অন ডেলিভারিতে পরিবর্তন করুন', 'Switch to cash on delivery')}
          </button>
          {modeError && <p className="hint hint--err">{modeError}</p>}
          <p className="hint">{t('অর্ডার নিশ্চিত হওয়ার আগ পর্যন্ত পেমেন্ট পদ্ধতি পরিবর্তন করা যাবে।', 'Payment method can be changed until the order is confirmed.')}</p>
        </div>
      )}

      {order.status === 'PENDING' && (
        <div className="order-cancel">
          <button type="button" className="btn btn--danger" disabled={cancelBusy} onClick={handleCancel}>
            {cancelBusy ? t('বাতিল হচ্ছে…', 'Cancelling…') : t('অর্ডার বাতিল করুন', 'Cancel order')}
          </button>
          {cancelError && <p className="hint hint--err">{cancelError}</p>}
          <p className="hint">{t('অর্ডার নিশ্চিত হওয়ার আগ পর্যন্ত আপনি এটি বাতিল করতে পারবেন।', 'You can cancel this order until it is confirmed.')}</p>
        </div>
      )}

      {order.status !== 'PENDING' && order.status !== 'CANCELLED' && order.status !== 'DELIVERED' && (
        <div className="order-cancel order-cancel--locked">
          <p>
            {t(
              'এই অর্ডারটি নিশ্চিত হয়ে গেছে, তাই আপনি নিজে এটি বাতিল করতে পারবেন না।',
              'This order has been confirmed, so it can no longer be cancelled by you.',
            )}
          </p>
          <p className="hint">
            {t('বাতিল করতে চাইলে অনুগ্রহ করে আমাদের সাথে যোগাযোগ করুন — ', 'If you still need to cancel it, please contact us — ')}
            <Link to="/contact">{t('যোগাযোগ পেজ', 'Contact page')}</Link>
          </p>
        </div>
      )}

      {order.status === 'DELIVERED' && (
        <Link to={`/orders/${order.id}/review`} className="order-detail__review-cta">
          ⭐ {t('এই অর্ডারের রিভিউ দিন', 'Review this order')}
        </Link>
      )}

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
          {order.amountPaid > 0 && (
            <tr>
              <td colSpan={3}>{t('পরিশোধিত', 'Paid')}</td>
              <td>{formatBdt(order.amountPaid)}</td>
            </tr>
          )}
          {order.amountDue > 0 && (
            <tr>
              <td colSpan={3}>{t('বাকি', 'Due')}</td>
              <td>{formatBdt(order.amountDue)}</td>
            </tr>
          )}
        </tfoot>
      </table>

      {order.delivery && (
        <div className="order-detail__address">
          <h3>{t('ডেলিভারি', 'Delivery')}</h3>
          <p>
            {t('স্ট্যাটাস:', 'Status:')} <span className="status status--payment">{deliveryStatusLabel[order.delivery.status]}</span>
            {order.delivery.provider ? ` · ${order.delivery.provider}` : ''}
          </p>
          {order.delivery.trackingRef && <p className="muted">{t('ট্র্যাকিং:', 'Tracking:')} {order.delivery.trackingRef}</p>}
        </div>
      )}

      <div className="order-detail__address">
        <h3>{t('ডেলিভারি ঠিকানা', 'Delivery address')}</h3>
        <p>
          {order.recipientName} · {order.recipientPhone}
          <br />
          {order.addressLine}
          {order.area ? `, ${order.area}` : ''}, {order.city}
        </p>
        {order.notes && <p className="muted">{t('নোট:', 'Note:')} {order.notes}</p>}
      </div>

      <PaymentPanel order={order} onOrderChange={setOrder} />

      <Link to="/orders">← {t('আমার সব অর্ডার', 'All my orders')}</Link>
    </section>
  )
}

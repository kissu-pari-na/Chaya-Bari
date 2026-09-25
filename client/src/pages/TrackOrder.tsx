import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { fetchTrackedOrder } from '../lib/orders'
import { formatBdt, formatDateWithDay } from '../lib/format'
import { orderStatusLabel, paymentStatusLabel } from '../lib/orderStatus'
import { formatSlotValue } from '../lib/slots'
import { deliveryStatusLabel } from '../lib/deliveryStatus'
import { usePoll } from '../lib/usePoll'
import { DocumentHeader } from '../components/DocumentHeader'
import { OrderTracker } from '../components/OrderTracker'
import { useAuth } from '../context/AuthContext'
import { useI18n } from '../context/LanguageContext'
import type { TrackedOrder } from '../types/order'
import './Orders.css'

/// Public order tracking, opened from the link emailed when the order is
/// confirmed. Works without logging in, so a customer who hasn't registered
/// yet (guest checkout, or an order an admin placed for them) can follow it.
export function TrackOrder() {
  const { t } = useI18n()
  const { user } = useAuth()
  const { token = '' } = useParams<{ token: string }>()
  const [order, setOrder] = useState<TrackedOrder | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetchTrackedOrder(token)
      .then(setOrder)
      .catch(() => setOrder(null))
      .finally(() => setLoading(false))
  }, [token])

  // Keep the progress live while the page is open.
  usePoll(
    () => {
      fetchTrackedOrder(token).then(setOrder).catch(() => {})
    },
    30000,
    !!order && order.status !== 'DELIVERED' && order.status !== 'CANCELLED',
  )

  if (loading) return <p className="muted">{t('লোড হচ্ছে…', 'Loading…')}</p>
  if (!order)
    return (
      <div className="paper">
        <p className="muted">
          {t(
            'এই ট্র্যাকিং লিংকটি সঠিক নয় বা অর্ডারটি পাওয়া যায়নি।',
            'This tracking link is not valid, or the order could not be found.',
          )}
        </p>
        <Link to="/">← {t('হোম', 'Home')}</Link>
      </div>
    )

  return (
    <section className="paper order-detail">
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
          {order.items.map((i, idx) => (
            <tr key={idx}>
              <td>{i.productName}</td>
              <td>{i.quantity}</td>
              <td>{formatBdt(i.unitPrice)}</td>
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
              <td colSpan={3}>{t('ফুড ডিসকাউন্ট', 'Food discount')}</td>
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
        <h3>{t('প্রাপক', 'Recipient')}</h3>
        <p>
          {order.recipientName}
          <br />
          {order.area ? `${order.area}, ` : ''}
          {order.city}
        </p>
      </div>

      {!user && (
        <div className="order-detail__address">
          {order.account.registered ? (
            <>
              <p>
                {t(
                  'আপনার সব অর্ডার দেখতে ও পেমেন্ট করতে লগইন করুন।',
                  'Log in to see all your orders and manage payments.',
                )}
              </p>
              <Link to="/login" className="btn btn--brand">
                {t('লগইন', 'Log in')}
              </Link>
            </>
          ) : (
            <>
              <p>
                {t(
                  `${order.account.maskedEmail ?? 'আপনার ইমেইল'} দিয়ে অ্যাকাউন্ট খুলুন — এই ইমেইলের সব অর্ডার আপনার অ্যাকাউন্টে চলে আসবে।`,
                  `Create an account with ${order.account.maskedEmail ?? 'your email'} — every order placed with that email will be in your account.`,
                )}
              </p>
              <Link to="/register" className="btn btn--brand">
                {t('অ্যাকাউন্ট খুলুন', 'Create account')}
              </Link>
            </>
          )}
        </div>
      )}
    </section>
  )
}

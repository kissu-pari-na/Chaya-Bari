import { useEffect, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { fetchMyOrder } from '../lib/orders'
import { formatBdt } from '../lib/format'
import { orderStatusLabel, paymentStatusLabel } from '../lib/orderStatus'
import { formatSlotValue } from '../lib/slots'
import { deliveryStatusLabel } from '../lib/deliveryStatus'
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

  useEffect(() => {
    if (!id) return
    fetchMyOrder(id)
      .then(setOrder)
      .catch(() => setError('__NOT_FOUND__'))
      .finally(() => setLoading(false))
  }, [id])

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
            {t('ডেলিভারির তারিখ:', 'Delivery date:')} {order.fulfillmentDate}
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

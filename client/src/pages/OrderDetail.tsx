import { useEffect, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { fetchMyOrder } from '../lib/orders'
import { formatBdt } from '../lib/format'
import { orderStatusLabel, paymentStatusLabel } from '../lib/orderStatus'
import { deliveryStatusLabel } from '../lib/deliveryStatus'
import { DocumentHeader } from '../components/DocumentHeader'
import { OrderTracker } from '../components/OrderTracker'
import { PaymentPanel } from './PaymentPanel'
import type { Order } from '../types/order'
import './Orders.css'

export function OrderDetail() {
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
      .catch(() => setError('অর্ডারটি পাওয়া যায়নি'))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return <p className="muted">লোড হচ্ছে…</p>
  if (error || !order)
    return (
      <div className="paper">
        <p className="muted">{error ?? 'অর্ডারটি পাওয়া যায়নি'}</p>
        <Link to="/orders">← আমার অর্ডার</Link>
      </div>
    )

  return (
    <section className="paper order-detail">
      {justPlaced && <div className="order-placed">✓ আপনার অর্ডার সফলভাবে গ্রহণ করা হয়েছে!</div>}
      <DocumentHeader />

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

      <OrderTracker status={order.status} />

      {order.status === 'DELIVERED' && (
        <Link to={`/orders/${order.id}/review`} className="order-detail__review-cta">
          ⭐ এই অর্ডারের রিভিউ দিন
        </Link>
      )}

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
          {order.amountPaid > 0 && (
            <tr>
              <td colSpan={3}>পরিশোধিত</td>
              <td>{formatBdt(order.amountPaid)}</td>
            </tr>
          )}
          {order.amountDue > 0 && (
            <tr>
              <td colSpan={3}>বাকি</td>
              <td>{formatBdt(order.amountDue)}</td>
            </tr>
          )}
        </tfoot>
      </table>

      {order.delivery && (
        <div className="order-detail__address">
          <h3>ডেলিভারি</h3>
          <p>
            স্ট্যাটাস: <span className="status status--payment">{deliveryStatusLabel[order.delivery.status]}</span>
            {order.delivery.provider ? ` · ${order.delivery.provider}` : ''}
          </p>
          {order.delivery.trackingRef && <p className="muted">ট্র্যাকিং: {order.delivery.trackingRef}</p>}
        </div>
      )}

      <div className="order-detail__address">
        <h3>ডেলিভারি ঠিকানা</h3>
        <p>
          {order.recipientName} · {order.recipientPhone}
          <br />
          {order.addressLine}
          {order.area ? `, ${order.area}` : ''}, {order.city}
        </p>
        {order.notes && <p className="muted">নোট: {order.notes}</p>}
      </div>

      <PaymentPanel order={order} onOrderChange={setOrder} />

      <Link to="/orders">← আমার সব অর্ডার</Link>
    </section>
  )
}

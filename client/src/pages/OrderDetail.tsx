import { useCallback, useEffect, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { cancelMyOrder, changeOrderPaymentMode, fetchMyOrder } from '../lib/orders'
import { fetchMyWallet } from '../lib/wallet'
import { formatBdt, formatDateWithDay } from '../lib/format'
import { orderStatusLabel, paymentModeLabel } from '../lib/orderStatus'
import { formatSlotValue } from '../lib/slots'
import { ApiError } from '../lib/apiClient'
import { usePoll } from '../lib/usePoll'
import { DocumentHeader } from '../components/DocumentHeader'
import { OrderTracker } from '../components/OrderTracker'
import { OrderPaymentBox } from '../components/OrderPaymentBox'
import { PayModePicker } from '../components/PayModePicker'
import { ReorderButton } from '../components/ReorderButton'
import { WalletTimeline } from '../components/WalletTimeline'
import { useI18n } from '../context/LanguageContext'
import type { Order, PaymentMode } from '../types/order'
import type { WalletSummary } from '../types/payment'
import './Orders.css'

/// A customer's order: where it is (5-step tracker), what to do about paying,
/// the receipt, and its payment history. Simple by design: one clear action at
/// a time (vault D-ORD-003, I-ORD-001).
export function OrderDetail() {
  const { t } = useI18n()
  const { id } = useParams<{ id: string }>()
  const location = useLocation()
  const justPlaced = (location.state as { justPlaced?: boolean } | null)?.justPlaced
  const [order, setOrder] = useState<Order | null>(null)
  const [wallet, setWallet] = useState<WalletSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  const refresh = useCallback(() => {
    if (!id) return
    fetchMyOrder(id).then(setOrder).catch(() => setError('__NOT_FOUND__'))
  }, [id])

  useEffect(() => {
    if (!id) return
    fetchMyOrder(id)
      .then(setOrder)
      .catch(() => setError('__NOT_FOUND__'))
      .finally(() => setLoading(false))
    fetchMyWallet()
      .then((r) => setWallet(r.wallet))
      .catch(() => setWallet(null))
  }, [id])

  // Near-live: reflect admin actions (confirm, dispatch, verify a payment…).
  usePoll(
    () => {
      if (!busy) refresh()
    },
    15000,
    !!order && order.status !== 'CANCELLED' && order.status !== 'DELIVERED',
  )

  async function switchMode(mode: PaymentMode) {
    if (!order || mode === order.paymentMode) return
    setBusy(true)
    setActionError(null)
    try {
      setOrder(await changeOrderPaymentMode(order.id, mode))
      fetchMyWallet()
        .then((r) => setWallet(r.wallet))
        .catch(() => {})
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : t('পরিবর্তন করা যায়নি', 'Could not change the payment method'))
    } finally {
      setBusy(false)
    }
  }

  async function cancel() {
    if (!order) return
    if (!window.confirm(t('আপনি কি নিশ্চিত এই অর্ডারটি বাতিল করতে চান?', 'Are you sure you want to cancel this order?'))) return
    setBusy(true)
    setActionError(null)
    try {
      setOrder(await cancelMyOrder(order.id))
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : t('অর্ডার বাতিল করা যায়নি', 'Could not cancel the order'))
    } finally {
      setBusy(false)
    }
  }

  if (loading)
    return (
      <div className="paper order-detail">
        <div className="skeleton" style={{ height: 32, width: '40%' }} />
        <div className="skeleton" style={{ height: 140, marginTop: 16 }} />
      </div>
    )
  if (error || !order)
    return (
      <div className="paper">
        <p className="muted">{t('অর্ডারটি পাওয়া যায়নি', 'Order not found')}</p>
        <Link to="/orders">← {t('আমার অর্ডার', 'My Orders')}</Link>
      </div>
    )

  const pending = order.status === 'PENDING'
  // Pay-later headroom for switching: what's available plus this order's own
  // charge if it's already on the wallet.
  const payLaterAvailable = wallet ? wallet.available + (order.paymentMode === 'PAY_LATER' ? order.onWallet : 0) : null

  return (
    <section className="paper order-detail">
      {justPlaced && <div className="order-placed">✓ {t('আপনার অর্ডার সফলভাবে গ্রহণ করা হয়েছে!', 'Your order was placed successfully!')}</div>}
      <DocumentHeader />

      <div className="order-detail__head">
        <div>
          <h1>
            {t('অর্ডার', 'Order')} <span className="num">{order.orderNumber}</span>
          </h1>
          <p className="muted">
            {formatDateWithDay(order.fulfillmentDate)}
            {order.timeSlot && <> · {formatSlotValue(order.timeSlot)}</>} · {paymentModeLabel[order.paymentMode]}
          </p>
        </div>
        <span className={`status status--${order.status.toLowerCase()}`}>{orderStatusLabel[order.status]}</span>
      </div>

      <OrderTracker
        status={order.status}
        paymentStatus={order.paymentStatus}
        paymentMode={order.paymentMode}
        amountDue={order.amountDue}
        readyAt={order.readyAt}
        dispatchedAt={order.dispatchedAt}
        deliveredAt={order.deliveredAt}
        delivery={order.delivery}
      />

      <OrderPaymentBox order={order} onClaimed={refresh} />

      {pending && (
        <section className="order-detail__section">
          <h2>{t('পেমেন্ট পদ্ধতি', 'Payment method')}</h2>
          <PayModePicker
            value={order.paymentMode}
            onChange={switchMode}
            total={order.total}
            payLaterAvailable={payLaterAvailable}
            credit={wallet?.credit}
            disabled={busy}
          />
          <p className="hint">{t('অর্ডার নিশ্চিত হওয়ার আগ পর্যন্ত বদলানো যাবে।', 'You can change it until the order is confirmed.')}</p>
        </section>
      )}
      {actionError && <p className="pay-note pay-note--err">{actionError}</p>}

      <div className="order-detail__actions">
        {order.status === 'DELIVERED' && (
          <Link to={`/orders/${order.id}/review`} className="btn btn--primary">
            ⭐ {t('রিভিউ দিন', 'Write a review')}
          </Link>
        )}
        <ReorderButton order={order} />
        {pending && (
          <button type="button" className="btn btn--danger" disabled={busy} onClick={cancel}>
            {t('অর্ডার বাতিল করুন', 'Cancel order')}
          </button>
        )}
      </div>
      {!pending && order.status !== 'CANCELLED' && order.status !== 'DELIVERED' && (
        <p className="hint">
          {t('অর্ডারটি নিশ্চিত হয়ে গেছে। বাতিল করতে চাইলে ', 'This order is confirmed. To cancel it, please ')}
          <Link to="/contact">{t('যোগাযোগ করুন', 'contact us')}</Link>.
        </p>
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
              <td colSpan={3}>
                {t('ফুড ডিসকাউন্ট', 'Food discount')}
                {order.couponCode ? ` (${order.couponCode})` : ''}
              </td>
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

      <div className="order-detail__address">
        <h3>{t('ডেলিভারি', 'Delivery')}</h3>
        <p>
          {order.recipientName} · {order.recipientPhone}
          <br />
          {order.addressLine}
          {order.area ? `, ${order.area}` : ''}, {order.city}
        </p>
        {order.delivery?.provider && (
          <p className="muted">
            {t('ডেলিভারি করছেন:', 'Delivered by:')} {order.delivery.provider}
            {order.delivery.trackingRef && <> · {order.delivery.trackingRef}</>}
          </p>
        )}
        {order.notes && (
          <p className="muted">
            {t('নোট:', 'Note:')} {order.notes}
          </p>
        )}
      </div>

      {order.payments.length > 0 && (
        <div className="order-detail__section">
          <h3>{t('পেমেন্টের ইতিহাস', 'Payment history')}</h3>
          <WalletTimeline entries={order.payments.map((p) => ({ ...p, orderId: null, orderNumber: null, reviewedAt: null, balanceAfter: null }))} />
        </div>
      )}

      <Link to="/orders">← {t('আমার সব অর্ডার', 'All my orders')}</Link>
    </section>
  )
}

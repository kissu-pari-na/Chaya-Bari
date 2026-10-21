import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { fetchAdminOrder, updateOrderStatus, type StatusExtras } from '../../lib/orders'
import { formatBdt, formatDateTime, formatDateWithDay } from '../../lib/format'
import { orderStatusLabel, paymentModeLabel } from '../../lib/orderStatus'
import { formatSlotValue } from '../../lib/slots'
import { ApiError } from '../../lib/apiClient'
import { usePoll } from '../../lib/usePoll'
import { useI18n } from '../../context/LanguageContext'
import { OrderTracker } from '../../components/OrderTracker'
import { DeliverySection } from './DeliverySection'
import { PaymentsSection } from './PaymentsSection'
import { ContributionSection } from './ContributionSection'
import type { AdminOrder, OrderStatus } from '../../types/order'
import '../Orders.css'
import './Admin.css'

/// The admin's order page. One "next step" card says what the order needs and
/// offers that single action (confirm → dispatch → deliver), so the flow is the
/// same five steps the customer sees (vault D-ORD-003). Money, delivery details
/// and profit sit beside it.
export function OrderDetailAdmin() {
  const { t } = useI18n()
  const { id } = useParams<{ id: string }>()
  const [order, setOrder] = useState<AdminOrder | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const refresh = useCallback(() => {
    if (id) fetchAdminOrder(id).then(setOrder).catch(() => {})
  }, [id])

  useEffect(() => {
    if (!id) return
    fetchAdminOrder(id)
      .then(setOrder)
      .catch(() => setError(t('অর্ডারটি পাওয়া যায়নি', 'Order not found')))
      .finally(() => setLoading(false))
  }, [id, t])

  usePoll(
    () => {
      if (!busy) refresh()
    },
    15000,
    !!order,
  )

  async function move(status: OrderStatus, extras: StatusExtras = {}) {
    if (!order) return
    if (status === 'CANCELLED' && !window.confirm(t('অর্ডারটি বাতিল করবেন? চার্জ থাকলে তা ফেরত যাবে।', 'Cancel this order? Any wallet charge is reversed.'))) return
    setBusy(true)
    setError(null)
    try {
      setOrder(await updateOrderStatus(order.id, status, extras))
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('পরিবর্তন করা যায়নি', 'Could not update the order'))
    } finally {
      setBusy(false)
    }
  }

  if (loading) return <div className="skeleton" style={{ height: 320 }} />
  if (error && !order) return <div className="admin-card"><p className="muted">{error}</p></div>
  if (!order) return null

  return (
    <section className="admin-order">
      <Link to="/admin/orders" className="admin-back">
        ← {t('সব অর্ডার', 'All orders')}
      </Link>

      <header className="admin-order__head">
        <div>
          <h1>
            {t('অর্ডার', 'Order')} <span className="num">{order.orderNumber}</span>
          </h1>
          <p className="muted">
            {formatDateWithDay(order.fulfillmentDate)}
            {order.timeSlot && <> · {formatSlotValue(order.timeSlot)}</>} · {paymentModeLabel[order.paymentMode]} ·{' '}
            {t('অর্ডার করা হয়েছে', 'placed')} {formatDateTime(order.createdAt)}
          </p>
        </div>
        <span className={`status status--${order.status.toLowerCase()}`}>{orderStatusLabel[order.status]}</span>
      </header>

      {error && <p className="pay-note pay-note--err">{error}</p>}

      <div className="admin-order__grid">
        <div className="admin-order__main">
          <NextStep order={order} busy={busy} onMove={move} />

          <section className="admin-card">
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
          </section>

          <section className="admin-card">
            <h2>{t('আইটেম', 'Items')}</h2>
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
          </section>

          <ContributionSection orderId={order.id} />
        </div>

        <aside className="admin-order__side">
          <section className="admin-card">
            <h2>{t('গ্রাহক', 'Customer')}</h2>
            <p className="admin-order__customer">
              <strong>{order.customer.name}</strong>
              {order.customer.isGuest && <span className="status status--payment">{t('অতিথি', 'Guest')}</span>}
              {order.customer.isPlaceholder && <span className="status status--payment">{t('এখনো সাইন ইন করেননি', 'Not signed in yet')}</span>}
              <br />
              {order.customer.phone && <a href={`tel:${order.customer.phone}`}>{order.customer.phone}</a>}
              {order.customer.email && <span className="muted"> · {order.customer.email}</span>}
            </p>
            <p>
              {order.recipientName} · <a href={`tel:${order.recipientPhone}`}>{order.recipientPhone}</a>
              <br />
              {order.addressLine}
              {order.area ? `, ${order.area}` : ''}, {order.city}
            </p>
            {order.notes && (
              <p className="pay-note pay-note--warn">
                {t('নোট:', 'Note:')} {order.notes}
              </p>
            )}
            {order.placedBy && (
              <p className="muted">{t(`${order.placedBy.name} গ্রাহকের পক্ষে অর্ডার করেছেন`, `Placed by ${order.placedBy.name} for the customer`)}</p>
            )}
            {order.trackingUrl && (
              <p className="muted">
                <a href={order.trackingUrl} target="_blank" rel="noreferrer">
                  {t('ট্র্যাকিং লিংক', 'Tracking link')} ↗
                </a>{' '}
                · {order.confirmationEmailSentAt ? t('ইমেইল করা হয়েছে', 'emailed') : t('ইমেইল নেই', 'no email')}
              </p>
            )}
          </section>

          <PaymentsSection order={order} onOrderChange={setOrder} onRefresh={refresh} />
          <DeliverySection orderId={order.id} refreshKey={`${order.status}-${order.dispatchedAt ?? ''}`} />
        </aside>
      </div>
    </section>
  )
}

/// What this order needs next, as one primary action (plus cancel while allowed).
function NextStep({ order, busy, onMove }: { order: AdminOrder; busy: boolean; onMove: (s: OrderStatus, extras?: StatusExtras) => void }) {
  const { t } = useI18n()
  const [provider, setProvider] = useState(order.delivery?.provider ?? '')
  const [trackingRef, setTrackingRef] = useState(order.delivery?.trackingRef ?? '')
  const [collected, setCollected] = useState(String(order.amountDue || order.total))

  const canCancel = order.status === 'PENDING' || order.status === 'CONFIRMED'
  const cancelBtn = canCancel && (
    <button type="button" className="btn btn--danger btn--sm" disabled={busy} onClick={() => onMove('CANCELLED')}>
      {t('অর্ডার বাতিল', 'Cancel order')}
    </button>
  )

  const dispatch = (e: FormEvent) => {
    e.preventDefault()
    onMove('OUT_FOR_DELIVERY', { provider: provider.trim() || undefined, trackingRef: trackingRef.trim() || undefined })
  }
  const deliver = (e: FormEvent) => {
    e.preventDefault()
    onMove('DELIVERED', order.paymentMode === 'COD' ? { collected: Number(collected) || 0, collectMethod: 'CASH' } : {})
  }

  let body: JSX.Element
  switch (order.status) {
    case 'PENDING':
      body =
        order.paymentMode === 'PAY_FIRST' && order.paymentStatus !== 'PAID' ? (
          <>
            <p className="next-step__text">
              {t(
                `পেমেন্টের অপেক্ষায় (${formatBdt(order.amountDue)} বাকি)। পেমেন্ট নিশ্চিত হলে অর্ডার নিজে থেকেই নিশ্চিত হবে।`,
                `Waiting for payment (${formatBdt(order.amountDue)} due). It confirms automatically once payment is confirmed.`,
              )}
            </p>
            <p className="muted">{t('পেমেন্ট কার্ডে দাবি যাচাই করুন বা টাকা রেকর্ড করুন।', 'Review a claim or record the money in the payment card.')}</p>
          </>
        ) : (
          <>
            <p className="next-step__text">{t('নতুন অর্ডার — নিশ্চিত করুন যাতে রান্নাঘর দেখতে পায়।', 'New order — confirm it so the kitchen sees it.')}</p>
            <button type="button" className="btn btn--primary" disabled={busy} onClick={() => onMove('CONFIRMED')}>
              ✓ {t('অর্ডার নিশ্চিত করুন', 'Confirm order')}
            </button>
          </>
        )
      break
    case 'CONFIRMED':
    case 'PREPARING':
      body = (
        <>
          <p className="next-step__text">
            {order.status === 'CONFIRMED'
              ? t('রান্নাঘরের অপেক্ষায়। প্রস্তুত হলে পাঠিয়ে দিন।', 'With the kitchen. Dispatch it when it is ready.')
              : order.readyAt
                ? t('প্যাক করা হয়েছে — পাঠানোর জন্য প্রস্তুত।', 'Packed and ready to dispatch.')
                : t('রান্না চলছে।', 'Being cooked.')}
          </p>
          <form className="next-step__form" onSubmit={dispatch}>
            <input value={provider} onChange={(e) => setProvider(e.target.value)} placeholder={t('কে ডেলিভারি করবেন (ঐচ্ছিক)', 'Delivered by (optional)')} aria-label={t('কে ডেলিভারি করবেন', 'Delivered by')} />
            <input value={trackingRef} onChange={(e) => setTrackingRef(e.target.value)} placeholder={t('ট্র্যাকিং / রাইডারের ফোন', 'Tracking / rider phone')} aria-label={t('ট্র্যাকিং', 'Tracking')} />
            <button type="submit" className="btn btn--primary" disabled={busy}>
              🛵 {t('পাঠিয়ে দিন', 'Dispatch')}
            </button>
          </form>
        </>
      )
      break
    case 'OUT_FOR_DELIVERY':
      body = (
        <>
          <p className="next-step__text">
            {t('পথে আছে', 'On the way')}
            {order.delivery?.provider && <> · {order.delivery.provider}</>}
          </p>
          <form className="next-step__form" onSubmit={deliver}>
            {order.paymentMode === 'COD' && (
              <label className="next-step__collect">
                {t('নগদ সংগ্রহ (৳)', 'Cash collected (৳)')}
                <input type="number" min={0} step="any" value={collected} onChange={(e) => setCollected(e.target.value)} />
              </label>
            )}
            <button type="submit" className="btn btn--primary" disabled={busy}>
              🎉 {t('ডেলিভার্ড', 'Mark delivered')}
            </button>
          </form>
          {order.paymentMode === 'COD' && (
            <p className="muted">{t('কম সংগ্রহ হলে বাকিটা গ্রাহকের ওয়ালেটে বকেয়া থাকবে।', 'If less is collected, the rest stays owed on the customer’s wallet.')}</p>
          )}
        </>
      )
      break
    case 'DELIVERED':
      body = <p className="next-step__text tone-gain">✓ {t('ডেলিভার্ড', 'Delivered')} {order.deliveredAt && formatDateTime(order.deliveredAt)}</p>
      break
    default:
      body = <p className="next-step__text tone-loss">✕ {t('বাতিল', 'Cancelled')}</p>
  }

  return (
    <section className="admin-card next-step" aria-live="polite">
      <span className="eyebrow">{t('পরবর্তী ধাপ', 'Next step')}</span>
      {body}
      {cancelBtn && <div className="next-step__cancel">{cancelBtn}</div>}
    </section>
  )
}

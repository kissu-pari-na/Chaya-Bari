import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ReorderButton } from '../components/ReorderButton'
import { fetchMyOrdersPage } from '../lib/orders'
import { useInfiniteScroll } from '../lib/useInfiniteScroll'
import { formatBdt, formatDateWithDay, toBnDigits } from '../lib/format'
import { orderStatusLabel } from '../lib/orderStatus'
import { formatSlotValue } from '../lib/slots'
import { useI18n } from '../context/LanguageContext'
import type { Order } from '../types/order'
import './Orders.css'

const PAGE_SIZE = 8

export function MyOrders() {
  const { t } = useI18n()
  const [orders, setOrders] = useState<Order[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState(false)
  const loadingMoreRef = useRef(false)

  useEffect(() => {
    fetchMyOrdersPage({ offset: 0, limit: PAGE_SIZE })
      .then((r) => {
        setOrders(r.orders)
        setTotal(r.total)
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [])

  const loadMore = useCallback(() => {
    if (loadingMoreRef.current) return
    loadingMoreRef.current = true
    setLoadingMore(true)
    fetchMyOrdersPage({ offset: orders.length, limit: PAGE_SIZE })
      .then((r) => {
        setOrders((cur) => [...cur, ...r.orders])
        setTotal(r.total)
      })
      .catch(() => {})
      .finally(() => {
        loadingMoreRef.current = false
        setLoadingMore(false)
      })
  }, [orders.length])

  const hasMore = orders.length < total
  const sentinel = useInfiniteScroll<HTMLDivElement>(loadMore, hasMore && !loading)

  if (loading) return <p className="muted">{t('লোড হচ্ছে…', 'Loading…')}</p>

  return (
    <section>
      <span className="eyebrow">{t('আপনার অর্ডার ইতিহাস', 'Your order history')}</span>
      <h1 className="myorders-title">{t('আমার অর্ডার', 'My Orders')}</h1>
      {error && <p className="muted">{t('অর্ডার লোড করা যায়নি', 'Could not load orders')}</p>}
      {!error && orders.length === 0 && (
        <div className="orders-empty">
          <div className="orders-empty__icon" aria-hidden="true">🧺</div>
          <p>{t('এখনো কোনো অর্ডার নেই।', 'No orders yet.')}</p>
          <Link to="/products" className="btn btn--primary">
            {t('অর্ডার শুরু করুন', 'Start ordering')}
          </Link>
        </div>
      )}
      <div className="order-list">
        {orders.map((o) => {
          const count = o.items.reduce((s, i) => s + i.quantity, 0)
          const preview = o.items.map((i) => i.productName).slice(0, 2).join(', ')
          return (
            <Link key={o.id} to={`/orders/${o.id}`} className="order-row">
              <div className="order-row__main">
                <div className="order-row__top">
                  <strong className="order-row__num">{o.orderNumber}</strong>
                  <span className={`status status--${o.status.toLowerCase()}`}>{orderStatusLabel[o.status]}</span>
                </div>
                <div className="order-row__sub">
                  <span>📅 {formatDateWithDay(o.fulfillmentDate)}{o.timeSlot ? ` · ${formatSlotValue(o.timeSlot)}` : ''}</span>
                  <span>· {toBnDigits(count)} {t('আইটেম', 'items')}</span>
                  {preview && <span className="order-row__preview">· {preview}{o.items.length > 2 ? '…' : ''}</span>}
                  {o.status === 'DELIVERED' && <span className="order-row__review">⭐ {t('রিভিউ দিন', 'Leave a review')}</span>}
                </div>
              </div>
              <div className="order-row__meta">
                <ReorderButton order={o} compact />
                <strong className="order-row__total">{formatBdt(o.total)}</strong>
                <span className="order-row__chev" aria-hidden="true">→</span>
              </div>
            </Link>
          )
        })}
      </div>

      {hasMore && <div ref={sentinel} className="infinite-sentinel" aria-hidden="true" />}
      {loadingMore && <p className="muted infinite-status">{t('আরও লোড হচ্ছে…', 'Loading more…')}</p>}
    </section>
  )
}

import { Link, useOutletContext } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useI18n } from '../context/LanguageContext'
import { formatBdt, formatDateWithDay, toBnDigits } from '../lib/format'
import { formatSlotValue } from '../lib/slots'
import { paymentModeLabel } from '../lib/orderStatus'
import { AdminIcon, type AdminIconName } from '../components/AdminIcons'
import type { AdminOverview } from '../lib/overview'
import './admin/Admin.css'

/// The admin home: what needs attention right now. Counts follow the five
/// order steps; the action list says what each order is waiting for.
export function AdminDashboard() {
  const { t } = useI18n()
  const { user } = useAuth()
  const { overview } = useOutletContext<{ overview: AdminOverview | null }>()

  const hour = new Date().getHours()
  const greeting = hour < 12 ? t('শুভ সকাল', 'Good morning') : hour < 17 ? t('শুভ দুপুর', 'Good afternoon') : t('শুভ সন্ধ্যা', 'Good evening')

  if (!overview) {
    return (
      <section className="admin-page">
        <div className="skeleton" style={{ height: 40, width: '40%' }} />
        <div className="kpis">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="skeleton" style={{ height: 96 }} />
          ))}
        </div>
        <div className="skeleton" style={{ height: 260 }} />
      </section>
    )
  }

  const c = overview.counts
  const steps: { label: string; value: number; to: string; tone?: 'warn' | 'info' | 'gain'; icon: AdminIconName }[] = [
    { label: t('নিশ্চিত করুন', 'To confirm'), value: c.toConfirm, to: '/admin/orders?status=PENDING', tone: c.toConfirm ? 'warn' : undefined, icon: 'orders' },
    { label: t('পেমেন্টের অপেক্ষায়', 'Awaiting payment'), value: c.awaitingPayment, to: '/admin/orders?status=PENDING', icon: 'wallet' },
    { label: t('রান্নাঘরে', 'In the kitchen'), value: c.inKitchen, to: '/admin/orders?status=PREPARING', icon: 'products' },
    { label: t('পাঠানোর জন্য প্রস্তুত', 'Ready to dispatch'), value: c.readyToDispatch, to: '/admin/deliveries', tone: c.readyToDispatch ? 'info' : undefined, icon: 'delivery' },
    { label: t('পথে আছে', 'On the way'), value: c.outForDelivery, to: '/admin/orders?status=OUT_FOR_DELIVERY', icon: 'delivery' },
    { label: t('আজ ডেলিভার্ড', 'Delivered today'), value: c.deliveredToday, to: '/admin/orders?status=DELIVERED', tone: 'gain', icon: 'reports' },
  ]

  const reasonLabel: Record<AdminOverview['needsAction'][number]['reason'], string> = {
    confirm: t('নিশ্চিত করুন', 'Confirm'),
    payment: t('পেমেন্ট যাচাই', 'Check payment'),
    dispatch: t('পাঠিয়ে দিন', 'Dispatch'),
    deliver: t('ডেলিভারি নিশ্চিত করুন', 'Mark delivered'),
  }

  return (
    <section className="admin-page">
      <header className="admin-page__head">
        <div>
          <span className="eyebrow">{formatDateWithDay(overview.today)}</span>
          <h1>
            {greeting}, {user?.name.split(' ')[0]}
          </h1>
          <p className="muted">
            {t(`আজ ${toBnDigits(c.todaysOrders)}টি অর্ডার ডেলিভারির জন্য।`, `${c.todaysOrders} order(s) to deliver today.`)}
          </p>
        </div>
        <div className="admin-page__actions">
          <Link to="/admin/orders/new" className="btn btn--primary">
            <AdminIcon name="plus" size={18} /> {t('নতুন অর্ডার', 'New order')}
          </Link>
        </div>
      </header>

      <div className="kpis kpis--steps">
        {steps.map((s) => (
          <Link key={s.label} to={s.to} className={`kpi kpi--link${s.tone ? ` kpi--${s.tone}` : ''}`}>
            <span className="kpi__icon" aria-hidden="true">
              <AdminIcon name={s.icon} size={18} />
            </span>
            <span className="kpi__label">{s.label}</span>
            <strong className="kpi__value num">{toBnDigits(s.value)}</strong>
          </Link>
        ))}
      </div>

      <div className="dash-grid">
        <section className="admin-card">
          <div className="admin-card__head">
            <h2>{t('আপনার করণীয়', 'Needs your action')}</h2>
            <Link to="/admin/orders">{t('সব অর্ডার', 'All orders')} →</Link>
          </div>
          {overview.needsAction.length === 0 ? (
            <p className="muted">✓ {t('সব কাজ শেষ! নতুন অর্ডার এলে এখানে দেখাবে।', 'All caught up! New orders will show up here.')}</p>
          ) : (
            <ul className="action-list">
              {overview.needsAction.map((o) => (
                <li key={o.id}>
                  <Link to={`/admin/orders/${o.id}`} className="action-list__row">
                    <span className={`action-list__reason action-list__reason--${o.reason}`}>{reasonLabel[o.reason]}</span>
                    <span className="action-list__main">
                      <span>
                        <strong className="num">{o.orderNumber}</strong> · {o.recipientName}
                      </span>
                      <span className="muted">
                        {formatDateWithDay(o.fulfillmentDate)}
                        {o.timeSlot && <> · {formatSlotValue(o.timeSlot)}</>} · {paymentModeLabel[o.paymentMode]}
                      </span>
                    </span>
                    <span className="num action-list__total">{formatBdt(o.total)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <div className="dash-side">
          <section className="admin-card">
            <div className="admin-card__head">
              <h2>{t('টাকা', 'Money')}</h2>
              <Link to="/admin/wallets">{t('ওয়ালেট', 'Wallets')} →</Link>
            </div>
            <dl className="facts">
              <div>
                <dt>{t('যাচাইয়ের অপেক্ষায়', 'Payments to review')}</dt>
                <dd className={overview.wallet.pendingClaims ? 'num tone-warn' : 'num'}>
                  {toBnDigits(overview.wallet.pendingClaims)} · {formatBdt(overview.wallet.pendingAmount)}
                </dd>
              </div>
              <div>
                <dt>{t('গ্রাহকদের বকেয়া', 'Owed by customers')}</dt>
                <dd className="num tone-warn">{formatBdt(overview.wallet.owed)}</dd>
              </div>
              <div>
                <dt>{t('গ্রাহকদের জমা', 'Customer credit')}</dt>
                <dd className="num">{formatBdt(overview.wallet.credit)}</dd>
              </div>
            </dl>
          </section>

          <section className="admin-card">
            <h2>{t('দ্রুত কাজ', 'Shortcuts')}</h2>
            <div className="quick-links">
              <Link to="/admin/products">
                <AdminIcon name="products" /> {t('পণ্য', 'Products')}
              </Link>
              <Link to="/admin/coupons">
                <AdminIcon name="coupons" /> {t('প্রোমো কোড', 'Promo codes')}
              </Link>
              <Link to="/admin/expenses">
                <AdminIcon name="expenses" /> {t('খরচ যোগ', 'Add expense')}
              </Link>
              <Link to="/admin/purchases">
                <AdminIcon name="purchases" /> {t('ক্রয়', 'Purchases')}
              </Link>
              <Link to="/admin/reports">
                <AdminIcon name="reports" /> {t('লাভ-ক্ষতি', 'Profit')}
              </Link>
              <Link to="/admin/analytics">
                <AdminIcon name="analytics" /> {t('অ্যানালিটিক্স', 'Analytics')}
              </Link>
            </div>
          </section>
        </div>
      </div>
    </section>
  )
}

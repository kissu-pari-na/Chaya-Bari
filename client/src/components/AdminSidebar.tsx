import { NavLink } from 'react-router-dom'
import { useI18n } from '../context/LanguageContext'
import { Logo } from './Logo'
import { AdminIcon, type AdminIconName } from './AdminIcons'
import type { AdminOverview } from '../lib/overview'

interface Item {
  to: string
  label: string
  icon: AdminIconName
  end?: boolean
  badge?: number
  badgeTone?: 'warn' | 'info'
}

interface Section {
  title?: string
  items: Item[]
}

/// The admin's navigation: seven short sections instead of a crowded header,
/// with live badges for what needs attention (orders to confirm, payments to
/// review). A drawer on small screens.
export function AdminSidebar({ open, onClose, overview }: { open: boolean; onClose: () => void; overview: AdminOverview | null }) {
  const { t } = useI18n()
  const c = overview?.counts
  const sections: Section[] = [
    { items: [{ to: '/admin', label: t('ড্যাশবোর্ড', 'Dashboard'), icon: 'dashboard', end: true }] },
    {
      title: t('অর্ডার', 'Orders'),
      items: [
        { to: '/admin/orders', label: t('সব অর্ডার', 'All orders'), icon: 'orders', badge: c ? c.toConfirm + c.awaitingPayment : 0, badgeTone: 'warn' },
        { to: '/admin/orders/new', label: t('নতুন অর্ডার', 'New order'), icon: 'plus', end: true },
        { to: '/admin/deliveries', label: t('ডেলিভারি', 'Deliveries'), icon: 'delivery', badge: c ? c.readyToDispatch : 0, badgeTone: 'info' },
      ],
    },
    {
      title: t('টাকা', 'Money'),
      items: [
        { to: '/admin/wallets', label: t('ওয়ালেট ও পেমেন্ট', 'Wallets & payments'), icon: 'wallet', badge: overview?.wallet.pendingClaims ?? 0, badgeTone: 'warn' },
        { to: '/admin/reports', label: t('রিপোর্ট ও লাভ', 'Reports & profit'), icon: 'reports' },
        { to: '/admin/expenses', label: t('খরচ', 'Expenses'), icon: 'expenses' },
      ],
    },
    {
      title: t('মেনু', 'Menu'),
      items: [
        { to: '/admin/products', label: t('পণ্য', 'Products'), icon: 'products' },
        { to: '/admin/categories', label: t('ক্যাটাগরি', 'Categories'), icon: 'categories' },
        { to: '/admin/coupons', label: t('কুপন ও প্রোমো', 'Coupons & promos'), icon: 'coupons' },
      ],
    },
    {
      title: t('স্টক', 'Stock'),
      items: [
        { to: '/admin/materials', label: t('উপকরণ', 'Materials'), icon: 'stock' },
        { to: '/admin/purchases', label: t('ক্রয়', 'Purchases'), icon: 'purchases' },
        { to: '/admin/costing', label: t('খরচ হিসাব', 'Costing'), icon: 'costing' },
      ],
    },
    { title: t('বিশ্লেষণ', 'Insights'), items: [{ to: '/admin/analytics', label: t('অ্যানালিটিক্স', 'Analytics'), icon: 'analytics' }] },
    {
      title: t('সেটিংস', 'Settings'),
      items: [
        { to: '/admin/ordering-settings', label: t('অর্ডার ও ওয়ালেট', 'Ordering & wallet'), icon: 'settings' },
        { to: '/admin/business-profile', label: t('বিজনেস প্রোফাইল', 'Business profile'), icon: 'business' },
        { to: '/admin/users', label: t('ব্যবহারকারী', 'Users'), icon: 'users' },
      ],
    },
  ]

  return (
    <>
      <div className={open ? 'admin-scrim admin-scrim--on' : 'admin-scrim'} onClick={onClose} aria-hidden="true" />
      <nav className={open ? 'admin-sidebar admin-sidebar--open' : 'admin-sidebar'} aria-label={t('অ্যাডমিন মেনু', 'Admin menu')}>
        <div className="admin-sidebar__brand">
          <Logo size={38} />
          <button type="button" className="admin-sidebar__close" onClick={onClose} aria-label={t('মেনু বন্ধ করুন', 'Close menu')}>
            <AdminIcon name="close" />
          </button>
        </div>
        <div className="admin-sidebar__scroll">
          {sections.map((s, i) => (
            <div className="admin-sidebar__section" key={s.title ?? i}>
              {s.title && <span className="admin-sidebar__title">{s.title}</span>}
              {s.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  onClick={onClose}
                  className={({ isActive }) => (isActive ? 'admin-sidebar__link admin-sidebar__link--active' : 'admin-sidebar__link')}
                >
                  <AdminIcon name={item.icon} />
                  <span className="admin-sidebar__label">{item.label}</span>
                  {!!item.badge && item.badge > 0 && (
                    <span className={`admin-badge admin-badge--${item.badgeTone ?? 'warn'}`} aria-label={t(`${item.badge}টি অপেক্ষমাণ`, `${item.badge} waiting`)}>
                      {item.badge}
                    </span>
                  )}
                </NavLink>
              ))}
            </div>
          ))}
        </div>
        <NavLink to="/" className="admin-sidebar__store" onClick={onClose}>
          <AdminIcon name="store" />
          <span>{t('স্টোর দেখুন', 'View store')}</span>
          <AdminIcon name="external" size={16} />
        </NavLink>
      </nav>
    </>
  )
}

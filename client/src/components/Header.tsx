import { NavLink, useNavigate } from 'react-router-dom'
import { Logo } from './Logo'
import { NotificationBell } from './NotificationBell'
import { PrefControls } from './PrefControls'
import { useAuth } from '../context/AuthContext'
import { useCart } from '../context/CartContext'
import { useI18n } from '../context/LanguageContext'
import './Header.css'

interface HeaderProps {
  variant: 'customer' | 'admin' | 'kitchen'
}

/** App header. Business identity stays consistent across customer, admin, and kitchen surfaces. */
export function Header({ variant }: HeaderProps) {
  const { user, logout } = useAuth()
  const { count } = useCart()
  const { t } = useI18n()
  const navigate = useNavigate()

  const links: Record<HeaderProps['variant'], { to: string; label: string; end?: boolean }[]> = {
    customer: [
      { to: '/', label: t('হোম', 'Home'), end: true },
      { to: '/products', label: t('পণ্য', 'Products') },
    ],
    admin: [
      { to: '/admin', label: t('ড্যাশবোর্ড', 'Dashboard'), end: true },
      { to: '/admin/reports', label: t('রিপোর্ট', 'Reports') },
      { to: '/admin/analytics', label: t('অ্যানালিটিক্স', 'Analytics') },
      { to: '/admin/orders', label: t('অর্ডার', 'Orders') },
      { to: '/admin/deliveries', label: t('ডেলিভারি', 'Deliveries') },
      { to: '/admin/products', label: t('পণ্য', 'Products') },
      { to: '/admin/categories', label: t('ক্যাটাগরি', 'Categories') },
      { to: '/admin/coupons', label: t('কুপন', 'Coupons') },
      { to: '/admin/materials', label: t('ইনভেন্টরি', 'Inventory') },
      { to: '/admin/purchases', label: t('ক্রয়', 'Purchases') },
      { to: '/admin/costing', label: t('কস্টিং', 'Costing') },
      { to: '/admin/expenses', label: t('খরচ', 'Expenses') },
      { to: '/admin/ordering-settings', label: t('সেটিংস', 'Settings') },
      { to: '/admin/business-profile', label: t('প্রোফাইল', 'Profile') },
    ],
    kitchen: [{ to: '/kitchen', label: t('প্রোডাকশন', 'Production'), end: true }],
  }

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    isActive ? 'app-header__link app-header__link--active' : 'app-header__link'

  return (
    <header className="app-header">
      <Logo />
      <nav className="app-header__nav">
        {links[variant].map((link) => (
          <NavLink key={link.to} to={link.to} end={link.end} className={linkClass}>
            {link.label}
          </NavLink>
        ))}

        {variant === 'customer' && (
          <>
            {user && (
              <NavLink to="/orders" className={linkClass}>
                {t('আমার অর্ডার', 'My Orders')}
              </NavLink>
            )}
            <NavLink to="/cart" className="app-header__cart">
              {t('কার্ট', 'Cart')}
              {count > 0 && <span className="app-header__cart-count">{count}</span>}
            </NavLink>
          </>
        )}

        <PrefControls />

        {user ? (
          <div className="app-header__user">
            <NotificationBell />
            <span className="app-header__name">{user.name}</span>
            <button type="button" className="app-header__logout" onClick={handleLogout}>
              {t('লগআউট', 'Log out')}
            </button>
          </div>
        ) : (
          <NavLink to="/login" className="btn btn--brand app-header__login">
            {t('লগইন', 'Log in')}
          </NavLink>
        )}
      </nav>
    </header>
  )
}

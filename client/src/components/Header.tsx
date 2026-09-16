import { useEffect, useState } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { Logo } from './Logo'
import { AdminNav } from './AdminNav'
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
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)

  // Close the mobile menu after navigating.
  useEffect(() => {
    setMenuOpen(false)
  }, [location.pathname])

  const flatLinks: Record<'customer' | 'kitchen', { to: string; label: string; end?: boolean }[]> = {
    customer: [
      { to: '/', label: t('হোম', 'Home'), end: true },
      { to: '/products', label: t('পণ্য', 'Products') },
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
      <div className="app-header__bar">
        <Logo />
        <div className="app-header__bar-actions">
          {user && (
            <span className="app-header__bar-bell">
              <NotificationBell />
            </span>
          )}
          {variant === 'customer' && (
            <NavLink
              to="/cart"
              className="app-header__cart-icon"
              aria-label={t('কার্ট', 'Cart')}
            >
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <circle cx="9" cy="21" r="1" />
                <circle cx="20" cy="21" r="1" />
                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
              </svg>
              {count > 0 && <span className="app-header__cart-count">{count}</span>}
            </NavLink>
          )}
          <button
            type="button"
            className="app-header__toggle"
            aria-label={t('মেনু', 'Menu')}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((o) => !o)}
          >
            {menuOpen ? '✕' : '☰'}
          </button>
        </div>
      </div>

      <nav className="app-header__nav" data-open={menuOpen}>
        {variant === 'admin' ? (
          <AdminNav />
        ) : (
          flatLinks[variant].map((link) => (
            <NavLink key={link.to} to={link.to} end={link.end} className={linkClass}>
              {link.label}
            </NavLink>
          ))
        )}

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
            <span className="app-header__nav-bell">
              <NotificationBell />
            </span>
            <NavLink to="/profile" className="app-header__name" title={t('প্রোফাইল', 'Profile')}>
              {user.name}
            </NavLink>
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

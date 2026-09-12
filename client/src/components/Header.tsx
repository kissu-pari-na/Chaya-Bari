import { NavLink, useNavigate } from 'react-router-dom'
import { Logo } from './Logo'
import { useAuth } from '../context/AuthContext'
import { useCart } from '../context/CartContext'
import './Header.css'

interface HeaderProps {
  variant: 'customer' | 'admin' | 'kitchen'
}

const links: Record<HeaderProps['variant'], { to: string; label: string; end?: boolean }[]> = {
  customer: [
    { to: '/', label: 'হোম', end: true },
    { to: '/products', label: 'পণ্য' },
  ],
  admin: [
    { to: '/admin', label: 'ড্যাশবোর্ড', end: true },
    { to: '/admin/reports', label: 'রিপোর্ট' },
    { to: '/admin/orders', label: 'অর্ডার' },
    { to: '/admin/deliveries', label: 'ডেলিভারি' },
    { to: '/admin/products', label: 'পণ্য' },
    { to: '/admin/categories', label: 'ক্যাটাগরি' },
    { to: '/admin/coupons', label: 'কুপন' },
    { to: '/admin/materials', label: 'ইনভেন্টরি' },
    { to: '/admin/purchases', label: 'ক্রয়' },
    { to: '/admin/costing', label: 'কস্টিং' },
    { to: '/admin/expenses', label: 'খরচ' },
    { to: '/admin/ordering-settings', label: 'সেটিংস' },
    { to: '/admin/business-profile', label: 'প্রোফাইল' },
  ],
  kitchen: [{ to: '/kitchen', label: 'প্রোডাকশন', end: true }],
}

/** App header. Business identity stays consistent across customer, admin, and kitchen surfaces. */
export function Header({ variant }: HeaderProps) {
  const { user, logout } = useAuth()
  const { count } = useCart()
  const navigate = useNavigate()

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
                আমার অর্ডার
              </NavLink>
            )}
            <NavLink to="/cart" className="app-header__cart">
              কার্ট
              {count > 0 && <span className="app-header__cart-count">{count}</span>}
            </NavLink>
          </>
        )}

        {user ? (
          <div className="app-header__user">
            <span className="app-header__name">{user.name}</span>
            <button type="button" className="app-header__logout" onClick={handleLogout}>
              লগআউট
            </button>
          </div>
        ) : (
          <NavLink to="/login" className="app-header__link">
            লগইন
          </NavLink>
        )}
      </nav>
    </header>
  )
}

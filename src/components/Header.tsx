import { NavLink } from 'react-router-dom'
import { Logo } from './Logo'
import './Header.css'

interface HeaderProps {
  variant: 'customer' | 'admin'
}

const customerLinks = [{ to: '/', label: 'হোম' }]

const adminLinks = [
  { to: '/admin', label: 'ড্যাশবোর্ড' },
  { to: '/admin/business-profile', label: 'বিজনেস প্রোফাইল' },
]

/** App header for customer-facing and admin surfaces. Business identity stays consistent across both. */
export function Header({ variant }: HeaderProps) {
  const links = variant === 'admin' ? adminLinks : customerLinks

  return (
    <header className="app-header">
      <Logo />
      <nav className="app-header__nav">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.to === '/' || link.to === '/admin'}
            className={({ isActive }) => (isActive ? 'app-header__link app-header__link--active' : 'app-header__link')}
          >
            {link.label}
          </NavLink>
        ))}
      </nav>
    </header>
  )
}

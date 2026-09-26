import { useEffect, useRef, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { useI18n } from '../context/LanguageContext'

interface NavItem {
  to: string
  label: string
  end?: boolean
}

interface NavGroup {
  label: string
  items: NavItem[]
}

/**
 * Admin navigation grouped into a few dropdown menus so the ~14 admin screens
 * don't crowd the header into one long, messy row.
 */
export function AdminNav() {
  const { t } = useI18n()
  const location = useLocation()
  const [open, setOpen] = useState<string | null>(null)
  const ref = useRef<HTMLDivElement>(null)

  // Close on outside click.
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(null)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  // Close whenever the route changes (e.g. after picking a menu item).
  useEffect(() => {
    setOpen(null)
  }, [location.pathname])

  const dashboard: NavItem = { to: '/admin', label: t('ড্যাশবোর্ড', 'Dashboard'), end: true }
  // Preview the storefront exactly as customers see it.
  const storePreview: NavItem = { to: '/', label: t('স্টোর দেখুন', 'View store'), end: true }

  const groups: NavGroup[] = [
    {
      label: t('অর্ডার', 'Orders'),
      items: [
        { to: '/admin/orders', label: t('অর্ডার', 'Orders') },
        { to: '/admin/deliveries', label: t('ডেলিভারি', 'Deliveries') },
      ],
    },
    {
      label: t('ক্যাটালগ', 'Catalog'),
      items: [
        { to: '/admin/products', label: t('পণ্য', 'Products') },
        { to: '/admin/categories', label: t('ক্যাটাগরি', 'Categories') },
        { to: '/admin/coupons', label: t('কুপন', 'Coupons') },
      ],
    },
    {
      label: t('ইনভেন্টরি', 'Inventory'),
      items: [
        { to: '/admin/materials', label: t('ইনভেন্টরি', 'Inventory') },
        { to: '/admin/purchases', label: t('ক্রয়', 'Purchases') },
        { to: '/admin/costing', label: t('কস্টিং', 'Costing') },
      ],
    },
    {
      label: t('হিসাব', 'Insights'),
      items: [
        { to: '/admin/reports', label: t('রিপোর্ট', 'Reports') },
        { to: '/admin/analytics', label: t('অ্যানালিটিক্স', 'Analytics') },
        { to: '/admin/expenses', label: t('খরচ', 'Expenses') },
      ],
    },
    {
      label: t('সেটিংস', 'Settings'),
      items: [
        { to: '/admin/ordering-settings', label: t('অর্ডার সেটিংস', 'Ordering') },
        { to: '/admin/business-profile', label: t('বিজনেস প্রোফাইল', 'Business profile') },
        { to: '/admin/users', label: t('ব্যবহারকারী', 'Users') },
      ],
    },
  ]

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    isActive ? 'app-header__link app-header__link--active' : 'app-header__link'

  return (
    <div className="admin-nav" ref={ref}>
      <NavLink to={dashboard.to} end={dashboard.end} className={linkClass}>
        {dashboard.label}
      </NavLink>
      <NavLink to={storePreview.to} end={storePreview.end} className={linkClass}>
        {storePreview.label}
      </NavLink>

      {groups.map((group) => {
        const groupActive = group.items.some((i) => location.pathname.startsWith(i.to))
        const isOpen = open === group.label
        return (
          <div className="nav-group" key={group.label}>
            <button
              type="button"
              className={
                groupActive || isOpen
                  ? 'app-header__link nav-group__btn nav-group__btn--active'
                  : 'app-header__link nav-group__btn'
              }
              aria-expanded={isOpen}
              onClick={() => setOpen((cur) => (cur === group.label ? null : group.label))}
            >
              {group.label}
              <span className="nav-group__caret" aria-hidden="true">
                ▾
              </span>
            </button>
            {/* Always rendered so small screens can show it inline via CSS; on
                desktop the --open modifier controls visibility. */}
            <div className={isOpen ? 'nav-group__menu nav-group__menu--open' : 'nav-group__menu'} role="menu">
              {group.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    isActive ? 'nav-group__item nav-group__item--active' : 'nav-group__item'
                  }
                  role="menuitem"
                >
                  {item.label}
                </NavLink>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

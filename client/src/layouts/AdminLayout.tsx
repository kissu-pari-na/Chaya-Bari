import { useCallback, useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { AdminSidebar } from '../components/AdminSidebar'
import { AdminIcon } from '../components/AdminIcons'
import { NotificationBell } from '../components/NotificationBell'
import { PrefControls } from '../components/PrefControls'
import { useAuth } from '../context/AuthContext'
import { useI18n } from '../context/LanguageContext'
import { fetchAdminOverview, type AdminOverview } from '../lib/overview'
import { usePoll } from '../lib/usePoll'
import './AdminLayout.css'

/// The admin shell: a sidebar of seven sections (a drawer on phones), a slim
/// top bar with preferences, notifications and the account, and the page. The
/// overview snapshot is shared with the page through the outlet context so the
/// sidebar badges and the dashboard agree.
export function AdminLayout() {
  const { t } = useI18n()
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [open, setOpen] = useState(false)
  const [overview, setOverview] = useState<AdminOverview | null>(null)

  const refresh = useCallback(() => {
    fetchAdminOverview()
      .then(setOverview)
      .catch(() => {})
  }, [])
  useEffect(refresh, [refresh, location.pathname])
  usePoll(refresh, 30_000)

  // Close the drawer with Escape.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  return (
    <div className="admin-shell">
      <a href="#main" className="skip-link">
        {t('মূল অংশে যান', 'Skip to content')}
      </a>
      <AdminSidebar open={open} onClose={() => setOpen(false)} overview={overview} />
      <div className="admin-shell__main">
        <header className="admin-topbar">
          <button type="button" className="admin-topbar__menu" onClick={() => setOpen(true)} aria-label={t('মেনু', 'Menu')} aria-expanded={open}>
            <AdminIcon name="menu" />
          </button>
          <div className="admin-topbar__spacer" />
          <PrefControls />
          <NotificationBell />
          {user && (
            <div className="admin-topbar__user">
              <NavLink to="/profile" className="admin-topbar__avatar" title={t('প্রোফাইল', 'Profile')}>
                {user.name.charAt(0).toUpperCase()}
              </NavLink>
              <button
                type="button"
                className="admin-topbar__logout"
                onClick={() => {
                  logout()
                  navigate('/login', { replace: true })
                }}
              >
                {t('লগআউট', 'Log out')}
              </button>
            </div>
          )}
        </header>
        <main id="main" className="admin-shell__content">
          <Outlet context={{ overview, refreshOverview: refresh }} />
        </main>
      </div>
    </div>
  )
}

import { Link, Navigate, Outlet } from 'react-router-dom'
import { Header } from '../components/Header'
import { CoverageBanner } from '../components/CoverageBanner'
import { PhoneNoticeBanner } from '../components/PhoneNoticeBanner'
import { useAuth } from '../context/AuthContext'
import { roleHome } from '../components/ProtectedRoute'
import { useI18n } from '../context/LanguageContext'
import './CustomerLayout.css'

interface CustomerLayoutProps {
  /// Pages anyone may open whatever their role (e.g. a public order-tracking
  /// link): staff stay on the page, under their own header, instead of being
  /// sent to their dashboard.
  allowStaff?: boolean
  /// Storefront pages an admin may preview exactly as customers see them
  /// (home, products, contact), with a banner leading back to the dashboard.
  adminPreview?: boolean
}

export function CustomerLayout({ allowStaff = false, adminPreview = false }: CustomerLayoutProps) {
  const { user, loading } = useAuth()
  const { t } = useI18n()
  const isStaff = !!user && (user.role === 'ADMIN' || user.role === 'KITCHEN')

  if (!loading && user?.role === 'ADMIN' && adminPreview) {
    return (
      <div className="page">
        <Header variant="customer" />
        <main className="page__content">
          <div className="admin-preview-bar" role="status">
            <span>
              👁️{' '}
              {t(
                'আপনি গ্রাহকের চোখে স্টোরটি দেখছেন (অ্যাডমিন প্রিভিউ)।',
                'You’re previewing the store as customers see it (admin preview).',
              )}
            </span>
            <Link to="/admin" className="admin-preview-bar__back">
              {t('ড্যাশবোর্ডে ফিরুন', 'Back to dashboard')} →
            </Link>
          </div>
          <CoverageBanner />
          <Outlet />
        </main>
      </div>
    )
  }

  if (!loading && isStaff && allowStaff) {
    return (
      <div className="page">
        <Header variant={user.role === 'ADMIN' ? 'admin' : 'kitchen'} />
        <main className="page__content">
          <Outlet />
        </main>
      </div>
    )
  }

  // The storefront is for customers and guests. Admin and kitchen staff are
  // sent to their own dashboard so they never land on — or get stuck in — the
  // customer view (rendering the customer shell first would flash it, so this
  // guards the whole layout rather than the index route alone).
  if (!loading && isStaff) {
    return <Navigate to={roleHome[user.role]} replace />
  }

  return (
    <div className="page">
      <Header variant="customer" />
      <main className="page__content">
        <CoverageBanner />
        <PhoneNoticeBanner />
        <Outlet />
      </main>
    </div>
  )
}

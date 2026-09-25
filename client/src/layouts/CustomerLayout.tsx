import { Navigate, Outlet } from 'react-router-dom'
import { Header } from '../components/Header'
import { CoverageBanner } from '../components/CoverageBanner'
import { PhoneNoticeBanner } from '../components/PhoneNoticeBanner'
import { useAuth } from '../context/AuthContext'
import { roleHome } from '../components/ProtectedRoute'

interface CustomerLayoutProps {
  /// Pages anyone may open whatever their role (e.g. a public order-tracking
  /// link): staff stay on the page, under their own header, instead of being
  /// sent to their dashboard.
  allowStaff?: boolean
}

export function CustomerLayout({ allowStaff = false }: CustomerLayoutProps) {
  const { user, loading } = useAuth()
  const isStaff = !!user && (user.role === 'ADMIN' || user.role === 'KITCHEN')

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

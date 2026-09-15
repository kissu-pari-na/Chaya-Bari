import { Navigate, Outlet } from 'react-router-dom'
import { Header } from '../components/Header'
import { useAuth } from '../context/AuthContext'
import { roleHome } from '../components/ProtectedRoute'

export function CustomerLayout() {
  const { user, loading } = useAuth()

  // The storefront is for customers and guests. Admin and kitchen staff are
  // sent to their own dashboard so they never land on — or get stuck in — the
  // customer view (rendering the customer shell first would flash it, so this
  // guards the whole layout rather than the index route alone).
  if (!loading && user && (user.role === 'ADMIN' || user.role === 'KITCHEN')) {
    return <Navigate to={roleHome[user.role]} replace />
  }

  return (
    <div className="page">
      <Header variant="customer" />
      <main className="page__content">
        <Outlet />
      </main>
    </div>
  )
}

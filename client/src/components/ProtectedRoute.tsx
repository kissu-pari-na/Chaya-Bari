import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import type { Role } from '../types/auth'

/// Default landing route for each role after login.
export const roleHome: Record<Role, string> = {
  CUSTOMER: '/',
  ADMIN: '/admin',
  KITCHEN: '/kitchen',
}

interface ProtectedRouteProps {
  roles?: Role[]
}

/// Guards nested routes: requires authentication, and optionally a role.
export function ProtectedRoute({ roles }: ProtectedRouteProps) {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return <div className="page__content">লোড হচ্ছে…</div>
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (roles && !roles.includes(user.role)) {
    return <Navigate to={roleHome[user.role]} replace />
  }

  return <Outlet />
}

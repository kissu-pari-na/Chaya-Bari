import { Link, Navigate, Outlet } from 'react-router-dom'
import { Header } from '../components/Header'
import { useAuth } from '../context/AuthContext'
import { useI18n } from '../context/LanguageContext'
import { roleHome } from '../components/ProtectedRoute'

export function CustomerLayout() {
  const { user, loading } = useAuth()
  const { t } = useI18n()

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
      {user && !user.emailVerified && (
        <div className="verify-banner">
          <span>
            {t(
              'আপনার ইমেইল এখনও নিশ্চিত করা হয়নি। ইমেইল দিয়ে লগইন করতে এটি নিশ্চিত করুন।',
              "Your email isn't confirmed yet. Confirm it to log in with your email.",
            )}
          </span>
          <Link to="/verify-email">{t('ইমেইল নিশ্চিত করুন', 'Confirm email')}</Link>
        </div>
      )}
      <main className="page__content">
        <Outlet />
      </main>
    </div>
  )
}

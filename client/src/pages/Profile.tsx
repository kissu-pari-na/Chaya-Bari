import { Link, useNavigate } from 'react-router-dom'
import { Header } from '../components/Header'
import { useAuth } from '../context/AuthContext'
import { useI18n } from '../context/LanguageContext'
import type { Role } from '../types/auth'
import './Profile.css'

const headerVariant: Record<Role, 'customer' | 'admin' | 'kitchen'> = {
  CUSTOMER: 'customer',
  ADMIN: 'admin',
  KITCHEN: 'kitchen',
}

export function Profile() {
  const { user, logout } = useAuth()
  const { t, lang } = useI18n()
  const navigate = useNavigate()

  if (!user) return null

  const roleLabel: Record<Role, string> = {
    CUSTOMER: t('গ্রাহক', 'Customer'),
    ADMIN: t('অ্যাডমিন', 'Administrator'),
    KITCHEN: t('কিচেন স্টাফ', 'Kitchen staff'),
  }

  const memberSince = new Date(user.createdAt).toLocaleDateString(lang === 'bn' ? 'bn-BD' : 'en-GB', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  const initials = user.name.trim().charAt(0).toUpperCase() || '?'

  return (
    <div className="page">
      <Header variant={headerVariant[user.role]} />
      <main className="page__content">
        <div className="profile">
          <div className="profile__head">
            <div className="profile__avatar" aria-hidden="true">{initials}</div>
            <div>
              <h1 className="profile__name">{user.name}</h1>
              <span className="profile__role">{roleLabel[user.role]}</span>
            </div>
          </div>

          <section className="profile__card">
            <h2>{t('অ্যাকাউন্ট তথ্য', 'Account information')}</h2>
            <dl className="profile__rows">
              <div className="profile__row">
                <dt>{t('নাম', 'Name')}</dt>
                <dd>{user.name}</dd>
              </div>
              <div className="profile__row">
                <dt>{t('ইমেইল', 'Email')}</dt>
                <dd>
                  {user.email}{' '}
                  {user.emailVerified ? (
                    <span className="profile__badge profile__badge--ok">{t('নিশ্চিত', 'Verified')}</span>
                  ) : (
                    <span className="profile__badge profile__badge--warn">{t('অনিশ্চিত', 'Unverified')}</span>
                  )}
                </dd>
              </div>
              <div className="profile__row">
                <dt>{t('মোবাইল নম্বর', 'Mobile number')}</dt>
                <dd>{user.phone || <span className="muted">{t('দেওয়া হয়নি', 'Not provided')}</span>}</dd>
              </div>
              <div className="profile__row">
                <dt>{t('রোল', 'Role')}</dt>
                <dd>{roleLabel[user.role]}</dd>
              </div>
              <div className="profile__row">
                <dt>{t('সদস্য যেদিন থেকে', 'Member since')}</dt>
                <dd>{memberSince}</dd>
              </div>
            </dl>
          </section>

          <div className="profile__actions">
            {user.role === 'CUSTOMER' && (
              <Link to="/orders" className="btn btn--brand">
                {t('আমার অর্ডার', 'My Orders')}
              </Link>
            )}
            <Link to="/forgot-password" state={{ email: user.email }} className="btn">
              {t('পাসওয়ার্ড পরিবর্তন', 'Change password')}
            </Link>
            <button type="button" className="btn" onClick={handleLogout}>
              {t('লগআউট', 'Log out')}
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}

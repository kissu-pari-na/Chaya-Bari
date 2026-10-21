import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useI18n } from '../context/LanguageContext'
import { roleHome } from '../components/ProtectedRoute'
import { ApiError } from '../lib/apiClient'
import { Logo } from '../components/Logo'
import { PrefControls } from '../components/PrefControls'
import { GoogleSignInButton, isGoogleEnabled } from '../components/GoogleSignInButton'
import './Auth.css'

/**
 * The single sign-in / sign-up screen. Sign-in is Google only (vault
 * D-AUTH-004): the first Google sign-in creates the account, and a missing phone
 * number is asked for at checkout. Staff sign in the same way with the Google
 * account for their registered email.
 */
export function Login() {
  const { loginWithGoogle } = useAuth()
  const { t } = useI18n()
  const navigate = useNavigate()
  const location = useLocation()
  const [error, setError] = useState<string | null>(null)

  async function handleGoogle(credential: string) {
    setError(null)
    try {
      const user = await loginWithGoogle(credential)
      const from = (location.state as { from?: { pathname: string } } | null)?.from?.pathname
      navigate(from ?? roleHome[user.role], { replace: true })
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('কিছু একটা সমস্যা হয়েছে', 'Something went wrong'))
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-prefs">
        <PrefControls />
      </div>
      <div className="auth-card">
        <div className="auth-card__logo">
          <Logo size={48} />
        </div>
        <h1>{t('সাইন ইন', 'Sign in')}</h1>
        <p className="auth-lede">
          {t(
            'আপনার গুগল অ্যাকাউন্ট দিয়ে এক ক্লিকে সাইন ইন করুন। নতুন হলে অ্যাকাউন্ট নিজে থেকেই তৈরি হবে, কোনো পাসওয়ার্ড লাগবে না।',
            'Sign in with your Google account in one tap. New here? Your account is created automatically, with no password to remember.',
          )}
        </p>
        {error && <div className="auth-error">{error}</div>}
        {isGoogleEnabled ? (
          <GoogleSignInButton text="continue_with" onCredential={handleGoogle} onError={setError} />
        ) : (
          <div className="auth-error">
            {t(
              'গুগল সাইন-ইন এখনো চালু করা হয়নি। অনুগ্রহ করে পরে চেষ্টা করুন।',
              'Google sign-in is not set up yet. Please try again later.',
            )}
          </div>
        )}
        <ul className="auth-perks">
          <li>{t('অর্ডার ট্র্যাক ও আগের অর্ডার দেখুন', 'Track orders and see your order history')}</li>
          <li>{t('এক ক্লিকে আবার অর্ডার করুন', 'Reorder in one tap')}</li>
          <li>{t('রিভিউ দিন ও নোটিফিকেশন পান', 'Leave reviews and get notifications')}</li>
        </ul>
        <p className="auth-alt">
          {t('অ্যাকাউন্ট ছাড়াই অর্ডার করতে চান?', 'Want to order without an account?')}{' '}
          <Link to="/products">{t('মেনু দেখুন', 'Browse the menu')}</Link>
        </p>
      </div>
    </div>
  )
}

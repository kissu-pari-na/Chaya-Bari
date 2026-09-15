import { useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useI18n } from '../context/LanguageContext'
import { roleHome } from '../components/ProtectedRoute'
import { ApiError } from '../lib/apiClient'
import { Logo } from '../components/Logo'
import './Auth.css'

export function Login() {
  const { login } = useAuth()
  const { t } = useI18n()
  const navigate = useNavigate()
  const location = useLocation()
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  // One-off notice passed from another screen (e.g. after a password reset).
  const notice = (location.state as { notice?: string } | null)?.notice ?? null
  // When the account exists but the email isn't confirmed yet, offer a link to
  // the confirmation screen instead of a dead-end error.
  const [needsEmail, setNeedsEmail] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setNeedsEmail(false)
    setSubmitting(true)
    try {
      const user = await login({ identifier, password })
      const from = (location.state as { from?: { pathname: string } } | null)?.from?.pathname
      navigate(from ?? roleHome[user.role], { replace: true })
    } catch (err) {
      if (err instanceof ApiError && err.code === 'EMAIL_UNVERIFIED') {
        setNeedsEmail(true)
        setError(
          t(
            'আপনার ইমেইল এখনও নিশ্চিত করা হয়নি।',
            'Your email has not been confirmed yet.',
          ),
        )
      } else {
        setError(err instanceof ApiError ? err.message : t('কিছু একটা সমস্যা হয়েছে', 'Something went wrong'))
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="auth-page">
      <form className="auth-card" onSubmit={handleSubmit}>
        <div className="auth-card__logo">
          <Logo size={48} />
        </div>
        <h1>{t('লগইন', 'Log in')}</h1>
        {notice && <div className="auth-notice">{notice}</div>}
        {error && <div className="auth-error">{error}</div>}
        {needsEmail && (
          <p className="auth-alt">
            <Link to="/verify-email" state={{ email: identifier }}>
              {t('ইমেইল নিশ্চিত করুন', 'Confirm your email')}
            </Link>
          </p>
        )}
        <label>
          {t('ইমেইল বা মোবাইল নম্বর', 'Email or mobile number')}
          <input
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            required
            autoComplete="username"
          />
        </label>
        <label>
          {t('পাসওয়ার্ড', 'Password')}
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />
        </label>
        <p className="auth-alt" style={{ textAlign: 'right', marginTop: 0 }}>
          <Link to="/forgot-password" state={{ email: identifier }}>
            {t('পাসওয়ার্ড ভুলে গেছেন?', 'Forgot password?')}
          </Link>
        </p>
        <button type="submit" disabled={submitting}>
          {submitting ? t('অপেক্ষা করুন…', 'Please wait…') : t('লগইন', 'Log in')}
        </button>
        <p className="auth-alt">
          {t('অ্যাকাউন্ট নেই?', "Don't have an account?")} <Link to="/register">{t('রেজিস্টার করুন', 'Register')}</Link>
        </p>
      </form>
    </div>
  )
}

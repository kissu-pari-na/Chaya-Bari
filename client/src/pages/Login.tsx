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
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      const user = await login({ email, password })
      const from = (location.state as { from?: { pathname: string } } | null)?.from?.pathname
      navigate(from ?? roleHome[user.role], { replace: true })
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('কিছু একটা সমস্যা হয়েছে', 'Something went wrong'))
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
        {error && <div className="auth-error">{error}</div>}
        <label>
          {t('ইমেইল', 'Email')}
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
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

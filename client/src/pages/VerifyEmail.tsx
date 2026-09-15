import { useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useI18n } from '../context/LanguageContext'
import { roleHome } from '../components/ProtectedRoute'
import { ApiError, apiRequest } from '../lib/apiClient'
import { Logo } from '../components/Logo'
import './Auth.css'

export function VerifyEmail() {
  const { verifyEmail } = useAuth()
  const { t } = useI18n()
  const navigate = useNavigate()
  const location = useLocation()
  const prefill = (location.state as { email?: string } | null)?.email ?? ''
  const [email, setEmail] = useState(prefill)
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [resending, setResending] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setNotice(null)
    setSubmitting(true)
    try {
      const user = await verifyEmail(email.trim(), code.trim())
      // Confirmation logs the user in; send them to their home.
      navigate(roleHome[user.role], { replace: true })
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('কিছু একটা সমস্যা হয়েছে', 'Something went wrong'))
    } finally {
      setSubmitting(false)
    }
  }

  async function handleResend() {
    setError(null)
    setNotice(null)
    setResending(true)
    try {
      await apiRequest('/auth/resend-email', { method: 'POST', body: { email: email.trim() } })
      setNotice(t('নতুন কোড পাঠানো হয়েছে।', 'A new code has been sent.'))
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('কিছু একটা সমস্যা হয়েছে', 'Something went wrong'))
    } finally {
      setResending(false)
    }
  }

  return (
    <div className="auth-page">
      <form className="auth-card" onSubmit={handleSubmit}>
        <div className="auth-card__logo">
          <Logo size={48} />
        </div>
        <h1>{t('ইমেইল নিশ্চিত করুন', 'Confirm your email')}</h1>
        <p className="auth-hint">
          {t(
            'আপনার ইমেইলে পাঠানো ৬-সংখ্যার কোডটি লিখুন।',
            'Enter the 6-digit code sent to your email.',
          )}
        </p>
        {error && <div className="auth-error">{error}</div>}
        {notice && <div className="auth-notice">{notice}</div>}
        <label>
          {t('ইমেইল', 'Email')}
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
        </label>
        <label>
          {t('নিশ্চিতকরণ কোড', 'Confirmation code')}
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            required
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="••••••"
          />
        </label>
        <button type="submit" disabled={submitting}>
          {submitting ? t('অপেক্ষা করুন…', 'Please wait…') : t('নিশ্চিত করুন', 'Confirm')}
        </button>
        <button type="button" className="auth-link-btn" onClick={handleResend} disabled={resending}>
          {resending ? t('পাঠানো হচ্ছে…', 'Sending…') : t('কোড আবার পাঠান', 'Resend code')}
        </button>
        <p className="auth-alt">
          <Link to="/login">{t('লগইনে ফিরে যান', 'Back to log in')}</Link>
        </p>
      </form>
    </div>
  )
}

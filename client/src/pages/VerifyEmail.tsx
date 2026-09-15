import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useI18n } from '../context/LanguageContext'
import { roleHome } from '../components/ProtectedRoute'
import { ApiError, apiRequest } from '../lib/apiClient'
import type { AuthUser } from '../types/auth'
import { Logo } from '../components/Logo'
import './Auth.css'

export function VerifyEmail() {
  const { user, updateUser } = useAuth()
  const { t } = useI18n()
  const navigate = useNavigate()
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [sending, setSending] = useState(false)

  // Nothing to do if already confirmed.
  if (user?.emailVerified) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <div className="auth-card__logo">
            <Logo size={48} />
          </div>
          <h1>{t('ইমেইল নিশ্চিত হয়েছে', 'Email confirmed')}</h1>
          <p className="auth-hint">{t('আপনার ইমেইল ইতিমধ্যে নিশ্চিত করা আছে।', 'Your email is already confirmed.')}</p>
          <button type="button" onClick={() => navigate(user ? roleHome[user.role] : '/')}>
            {t('ফিরে যান', 'Go back')}
          </button>
        </div>
      </div>
    )
  }

  async function handleSend() {
    setError(null)
    setNotice(null)
    setSending(true)
    try {
      await apiRequest('/auth/email/send-code', { method: 'POST', auth: true })
      setNotice(t('আপনার ইমেইলে একটি কোড পাঠানো হয়েছে।', 'A code has been sent to your email.'))
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('কিছু একটা সমস্যা হয়েছে', 'Something went wrong'))
    } finally {
      setSending(false)
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setNotice(null)
    setSubmitting(true)
    try {
      const res = await apiRequest<{ user: AuthUser }>('/auth/email/verify', {
        method: 'POST',
        auth: true,
        body: { code: code.trim() },
      })
      updateUser(res.user)
      setNotice(t('আপনার ইমেইল নিশ্চিত হয়েছে।', 'Your email has been confirmed.'))
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
        <h1>{t('ইমেইল নিশ্চিত করুন', 'Confirm your email')}</h1>
        <p className="auth-hint">
          {t(
            'আপনার ইমেইলে পাঠানো ৬-সংখ্যার কোডটি লিখুন। ইমেইল দিয়ে লগইন করতে হলে এটি নিশ্চিত করতে হবে।',
            'Enter the 6-digit code sent to your email. This is required to log in with your email.',
          )}
        </p>
        {error && <div className="auth-error">{error}</div>}
        {notice && <div className="auth-notice">{notice}</div>}
        {user?.email && (
          <p className="auth-hint">{user.email}</p>
        )}
        <button type="button" className="auth-link-btn" onClick={handleSend} disabled={sending}>
          {sending ? t('পাঠানো হচ্ছে…', 'Sending…') : t('কোড পাঠান', 'Send code')}
        </button>
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
      </form>
    </div>
  )
}

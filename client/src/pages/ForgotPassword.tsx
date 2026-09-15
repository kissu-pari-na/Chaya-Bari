import { useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { useI18n } from '../context/LanguageContext'
import { ApiError, apiRequest } from '../lib/apiClient'
import { Logo } from '../components/Logo'
import { PrefControls } from '../components/PrefControls'
import './Auth.css'

export function ForgotPassword() {
  const { t } = useI18n()
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  // Prefill the email from the "Set your own password" link in emails
  // (?email=…), or from in-app navigation (router state).
  const prefill =
    searchParams.get('email') ?? (location.state as { email?: string } | null)?.email ?? ''
  const [email, setEmail] = useState(prefill)
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const [resetting, setResetting] = useState(false)
  // Arriving from the "Set your own password" email link vs the login page.
  const fromInvite = searchParams.get('email') != null

  async function handleSend(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setNotice(null)
    if (!email.trim()) {
      setError(t('ইমেইল দিন', 'Enter your email'))
      return
    }
    setSending(true)
    try {
      await apiRequest('/auth/forgot-password', { method: 'POST', body: { email: email.trim() } })
      setNotice(
        t(
          'যদি এই ইমেইলে অ্যাকাউন্ট থাকে, একটি রিসেট কোড পাঠানো হয়েছে। ইনবক্স দেখুন।',
          'If an account exists for this email, a reset code has been sent. Check your inbox.',
        ),
      )
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('কিছু একটা সমস্যা হয়েছে', 'Something went wrong'))
    } finally {
      setSending(false)
    }
  }

  async function handleReset(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setNotice(null)
    setResetting(true)
    try {
      await apiRequest('/auth/reset-password', {
        method: 'POST',
        body: { email: email.trim(), code: code.trim(), password },
      })
      navigate('/login', {
        replace: true,
        state: { notice: t('পাসওয়ার্ড পরিবর্তন হয়েছে। এখন লগইন করুন।', 'Password changed. You can now log in.') },
      })
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('কিছু একটা সমস্যা হয়েছে', 'Something went wrong'))
    } finally {
      setResetting(false)
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
        <h1>{fromInvite ? t('নিজের পাসওয়ার্ড সেট করুন', 'Set your password') : t('পাসওয়ার্ড রিসেট', 'Reset password')}</h1>
        <p className="auth-hint">
          {t(
            'আপনার ইমেইলে একটি কোড পাঠানো হবে। তারপর নতুন পাসওয়ার্ড সেট করুন।',
            "We'll email you a code, then set a new password.",
          )}
        </p>
        {error && <div className="auth-error">{error}</div>}
        {notice && <div className="auth-notice">{notice}</div>}

        {/* Step 1 — request a code */}
        <form onSubmit={handleSend}>
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
          <button type="submit" className="auth-link-btn" disabled={sending}>
            {sending ? t('পাঠানো হচ্ছে…', 'Sending…') : t('রিসেট কোড পাঠান', 'Send reset code')}
          </button>
        </form>

        <div className="pay-divider" style={{ margin: '0.5rem 0' }}>
          <span>{t('তারপর', 'then')}</span>
        </div>

        {/* Step 2 — set a new password with the code */}
        <form onSubmit={handleReset}>
          <label>
            {t('রিসেট কোড', 'Reset code')}
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              required
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="••••••"
            />
          </label>
          <label>
            {t('নতুন পাসওয়ার্ড', 'New password')}
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
            />
          </label>
          <button type="submit" disabled={resetting}>
            {resetting ? t('অপেক্ষা করুন…', 'Please wait…') : t('পাসওয়ার্ড পরিবর্তন করুন', 'Change password')}
          </button>
        </form>

        <p className="auth-alt">
          <Link to="/login">{t('লগইনে ফিরে যান', 'Back to log in')}</Link>
        </p>
      </div>
    </div>
  )
}

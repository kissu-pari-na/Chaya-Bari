import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useI18n } from '../context/LanguageContext'
import { roleHome } from '../components/ProtectedRoute'
import { ApiError } from '../lib/apiClient'
import { Logo } from '../components/Logo'
import { PrefControls } from '../components/PrefControls'
import { GoogleSignInButton, isGoogleEnabled } from '../components/GoogleSignInButton'
import './Auth.css'

export function Register() {
  const { register, loginWithGoogle } = useAuth()
  const { t } = useI18n()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  // Prefilled from links like the order-confirmation email's "Create account".
  const [searchParams] = useSearchParams()
  const [email, setEmail] = useState(searchParams.get('email') ?? '')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleGoogle(credential: string) {
    setError(null)
    try {
      const user = await loginWithGoogle(credential)
      navigate(roleHome[user.role], { replace: true })
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('কিছু একটা সমস্যা হয়েছে', 'Something went wrong'))
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await register({ name, email, phone, password })
      // Registration does not log in — the email must be confirmed first. Send
      // the user to the confirmation screen with the email prefilled.
      navigate('/verify-email', { replace: true, state: { email } })
    } catch (err) {
      if (err instanceof ApiError && err.details?.length) {
        setError(err.details.map((d) => d.message).join(' · '))
      } else {
        setError(err instanceof ApiError ? err.message : t('কিছু একটা সমস্যা হয়েছে', 'Something went wrong'))
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-prefs">
        <PrefControls />
      </div>
      <form className="auth-card" onSubmit={handleSubmit}>
        <div className="auth-card__logo">
          <Logo size={48} />
        </div>
        <h1>{t('রেজিস্টার', 'Register')}</h1>
        {error && <div className="auth-error">{error}</div>}
        {isGoogleEnabled && (
          <>
            <GoogleSignInButton text="signup_with" onCredential={handleGoogle} onError={setError} />
            <div className="auth-divider">
              <span>{t('অথবা', 'or')}</span>
            </div>
          </>
        )}
        <label>
          {t('নাম', 'Name')}
          <input value={name} onChange={(e) => setName(e.target.value)} required autoComplete="name" />
        </label>
        <label>
          {t('ইমেইল', 'Email')}
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
        </label>
        <label>
          {t('মোবাইল নম্বর', 'Mobile number')}
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
            autoComplete="tel"
            placeholder="01XXXXXXXXX"
          />
          <span className="auth-hint">
            {t(
              'ডেলিভারি ও যোগাযোগের জন্য প্রয়োজন।',
              'Used for delivery and contact.',
            )}
          </span>
        </label>
        <label>
          {t('পাসওয়ার্ড', 'Password')}
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            autoComplete="new-password"
          />
        </label>
        <button type="submit" disabled={submitting}>
          {submitting ? t('অপেক্ষা করুন…', 'Please wait…') : t('রেজিস্টার', 'Register')}
        </button>
        <p className="auth-alt">
          {t('আগে থেকে অ্যাকাউন্ট আছে?', 'Already have an account?')} <Link to="/login">{t('লগইন করুন', 'Log in')}</Link>
        </p>
      </form>
    </div>
  )
}

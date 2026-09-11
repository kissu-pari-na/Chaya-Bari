import { useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { roleHome } from '../components/ProtectedRoute'
import { ApiError } from '../lib/apiClient'
import { Logo } from '../components/Logo'
import './Auth.css'

export function Login() {
  const { login } = useAuth()
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
      setError(err instanceof ApiError ? err.message : 'কিছু একটা সমস্যা হয়েছে')
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
        <h1>লগইন</h1>
        {error && <div className="auth-error">{error}</div>}
        <label>
          ইমেইল
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
        </label>
        <label>
          পাসওয়ার্ড
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />
        </label>
        <button type="submit" disabled={submitting}>
          {submitting ? 'অপেক্ষা করুন…' : 'লগইন'}
        </button>
        <p className="auth-alt">
          অ্যাকাউন্ট নেই? <Link to="/register">রেজিস্টার করুন</Link>
        </p>
      </form>
    </div>
  )
}

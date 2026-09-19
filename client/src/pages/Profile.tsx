import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Header } from '../components/Header'
import { AddressBook } from '../components/AddressBook'
import { useAuth } from '../context/AuthContext'
import { useI18n } from '../context/LanguageContext'
import { ApiError } from '../lib/apiClient'
import type { Role } from '../types/auth'
import './Profile.css'

const headerVariant: Record<Role, 'customer' | 'admin' | 'kitchen'> = {
  CUSTOMER: 'customer',
  ADMIN: 'admin',
  KITCHEN: 'kitchen',
}

export function Profile() {
  const { user, logout, updateProfile } = useAuth()
  const { t, lang } = useI18n()
  const navigate = useNavigate()

  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(user?.name ?? '')
  const [phone, setPhone] = useState(user?.phone ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  if (!user) return null

  function startEdit() {
    if (!user) return
    setName(user.name)
    setPhone(user.phone ?? '')
    setError(null)
    setSaved(false)
    setEditing(true)
  }

  async function handleSave(event: FormEvent) {
    event.preventDefault()
    if (!user) return
    setError(null)
    const payload: { name?: string; phone?: string } = {}
    if (name.trim() && name.trim() !== user.name) payload.name = name.trim()
    if (phone.trim() && phone.trim() !== (user.phone ?? '')) payload.phone = phone.trim()
    if (payload.name === undefined && payload.phone === undefined) {
      setEditing(false)
      return
    }
    setSaving(true)
    try {
      await updateProfile(payload)
      setEditing(false)
      setSaved(true)
    } catch (err) {
      if (err instanceof ApiError && err.details?.length) setError(err.details.map((d) => d.message).join(' · '))
      else setError(err instanceof ApiError ? err.message : t('সংরক্ষণ করা যায়নি', 'Could not save changes'))
    } finally {
      setSaving(false)
    }
  }

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

          <section className="profile__card" id="phone">
            <div className="profile__card-head">
              <h2>{t('অ্যাকাউন্ট তথ্য', 'Account information')}</h2>
              {!editing && (
                <button type="button" className="btn btn--sm" onClick={startEdit}>
                  {t('সম্পাদনা', 'Edit')}
                </button>
              )}
            </div>

            {saved && !editing && (
              <p className="profile__saved">✓ {t('তথ্য সংরক্ষণ করা হয়েছে', 'Your details were saved')}</p>
            )}
            {!user.phone && !editing && (
              <p className="profile__phone-warn">
                {t(
                  'আপনার মোবাইল নম্বর দেওয়া নেই। ডেলিভারির জন্য নম্বরটি যোগ করুন।',
                  'Your mobile number is missing. Please add it so we can reach you for delivery.',
                )}
              </p>
            )}

            {editing ? (
              <form className="profile__edit" onSubmit={handleSave}>
                {error && <div className="auth-error">{error}</div>}
                <label>
                  {t('নাম', 'Name')}
                  <input value={name} onChange={(e) => setName(e.target.value)} minLength={2} maxLength={100} required />
                </label>
                <label>
                  {t('মোবাইল নম্বর', 'Mobile number')}
                  <input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder={t('যেমন: 01XXXXXXXXX', 'e.g. 01XXXXXXXXX')}
                    maxLength={20}
                    inputMode="tel"
                  />
                </label>
                <div className="profile__edit-actions">
                  <button type="submit" className="btn btn--brand" disabled={saving}>
                    {saving ? t('সংরক্ষণ হচ্ছে…', 'Saving…') : t('সংরক্ষণ করুন', 'Save changes')}
                  </button>
                  <button type="button" className="btn" onClick={() => setEditing(false)} disabled={saving}>
                    {t('বাতিল', 'Cancel')}
                  </button>
                </div>
              </form>
            ) : (
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
            )}
          </section>

          {user.role === 'CUSTOMER' && <AddressBook />}

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

import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useI18n } from '../context/LanguageContext'
import './PhoneNoticeBanner.css'

const DISMISS_KEY = 'chaya_bari_phone_notice_dismissed'

function wasDismissed(): boolean {
  try {
    return sessionStorage.getItem(DISMISS_KEY) === '1'
  } catch {
    return false
  }
}

/// A gentle, storefront-wide prompt asking a signed-in customer who has no phone
/// number on file to add one (needed for delivery contact). Links to the profile
/// editor. Dismissable for the session; comes back on the next visit.
export function PhoneNoticeBanner() {
  const { user } = useAuth()
  const { t } = useI18n()
  const [dismissed, setDismissed] = useState(wasDismissed)

  if (!user || user.role !== 'CUSTOMER' || user.phone || dismissed) return null

  function dismiss() {
    setDismissed(true)
    try {
      sessionStorage.setItem(DISMISS_KEY, '1')
    } catch {
      // ignore storage errors
    }
  }

  return (
    <div className="phone-notice" role="status">
      <span className="phone-notice__icon" aria-hidden="true">📱</span>
      <span className="phone-notice__text">
        {t(
          'ডেলিভারির জন্য আপনার মোবাইল নম্বর যোগ করুন।',
          'Add your mobile number so we can reach you for delivery.',
        )}{' '}
        <Link to="/profile#phone" className="phone-notice__link">
          {t('নম্বর যোগ করুন', 'Add number')} →
        </Link>
      </span>
      <button type="button" className="phone-notice__close" aria-label={t('বন্ধ করুন', 'Dismiss')} onClick={dismiss}>
        ✕
      </button>
    </div>
  )
}

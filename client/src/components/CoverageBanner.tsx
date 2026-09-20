import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useI18n } from '../context/LanguageContext'
import { isOrbitaxEmail } from '../lib/orbitax'
import { DELIVERY_ZONES } from '../lib/deliveryAreas'
import './CoverageBanner.css'

const DISMISS_KEY = 'chaya_bari_coverage_banner_dismissed'

function wasDismissed(): boolean {
  try {
    return localStorage.getItem(DISMISS_KEY) === '1'
  } catch {
    return false
  }
}

/// A closeable promotional banner shown across the storefront telling everyone
/// which areas we deliver to. Orbitax staff also see their Mohakhali office
/// listed as a covered location. Dismissal persists (localStorage).
export function CoverageBanner() {
  const { user } = useAuth()
  const { t } = useI18n()
  const [dismissed, setDismissed] = useState(wasDismissed)

  if (dismissed) return null

  const isOrbitax = !!user && isOrbitaxEmail(user.email)
  // Zone group labels read well on their own (e.g. "Mirpur 12 & DOHS").
  const zones = Object.keys(DELIVERY_ZONES).map((z) => z.replace(/\s*Zone$/i, ''))

  function dismiss() {
    setDismissed(true)
    try {
      localStorage.setItem(DISMISS_KEY, '1')
    } catch {
      // ignore storage errors (private mode etc.)
    }
  }

  return (
    <div className="coverage-banner" role="note">
      <span className="coverage-banner__icon" aria-hidden="true">🛵</span>
      <span className="coverage-banner__text">
        <strong>{t('আপনার এলাকায় ডেলিভারি!', 'We deliver to your area!')}</strong>{' '}
        {t('আমরা এখন ডেলিভারি করছি:', 'Now delivering across')}{' '}
        {zones.join(', ')}
        {isOrbitax && <> {t('এবং', 'and')} Orbitax BD, Mohakhali</>}
        {'. '}
        <Link to="/contact" className="coverage-banner__link">
          {t('সব এলাকা দেখুন', 'See all areas')} →
        </Link>
      </span>
      <button
        type="button"
        className="coverage-banner__close"
        aria-label={t('বন্ধ করুন', 'Dismiss')}
        onClick={dismiss}
      >
        ✕
      </button>
    </div>
  )
}

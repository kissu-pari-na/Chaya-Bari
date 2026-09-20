import { useEffect, useState } from 'react'
import { useI18n } from '../context/LanguageContext'
import { disablePush, enablePush, fetchVapidKey, isSubscribed, pushPermission, pushSupported } from '../lib/push'

/// Profile control to turn OS-level phone notifications on/off for this device.
/// Hidden entirely when the browser can't do push or the server has no VAPID
/// keys configured (the feature is then simply unavailable).
export function PushToggle() {
  const { t } = useI18n()
  const [ready, setReady] = useState(false)
  const [available, setAvailable] = useState(false)
  const [subscribed, setSubscribed] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    async function init() {
      if (!pushSupported()) {
        if (active) setReady(true)
        return
      }
      const key = await fetchVapidKey().catch(() => null)
      const sub = await isSubscribed()
      if (!active) return
      setAvailable(!!key)
      setSubscribed(sub)
      setReady(true)
    }
    void init()
    return () => {
      active = false
    }
  }, [])

  if (!ready) return null

  const denied = pushSupported() && pushPermission() === 'denied'

  async function turnOn() {
    setBusy(true)
    setError(null)
    const res = await enablePush()
    if (res.ok) setSubscribed(true)
    else if (res.reason === 'denied')
      setError(t('আপনার ব্রাউজারে নোটিফিকেশন ব্লক করা আছে।', 'Notifications are blocked in your browser settings.'))
    else setError(t('চালু করা যায়নি।', 'Could not enable notifications.'))
    setBusy(false)
  }

  async function turnOff() {
    setBusy(true)
    setError(null)
    await disablePush()
    setSubscribed(false)
    setBusy(false)
  }

  return (
    <section className="profile__card">
      <h2>{t('ফোন নোটিফিকেশন', 'Phone notifications')}</h2>
      {!pushSupported() ? (
        <p className="muted">
          {t('এই ব্রাউজারে ফোন নোটিফিকেশন সমর্থিত নয়।', "This browser doesn't support phone notifications.")}
        </p>
      ) : !available ? (
        <p className="muted">{t('এই সুবিধাটি শীঘ্রই আসছে।', 'This feature is coming soon.')}</p>
      ) : subscribed ? (
        <>
          <p className="profile__saved">
            ✓ {t('এই ডিভাইসে ফোন নোটিফিকেশন চালু আছে।', 'Phone notifications are on for this device.')}
          </p>
          <p className="muted" style={{ marginTop: 0 }}>
            {t(
              'অর্ডার ও পেমেন্ট আপডেট আপনার ফোনে সিস্টেম নোটিফিকেশন হিসেবে আসবে।',
              'Order and payment updates will arrive as system notifications on your phone.',
            )}
          </p>
          <button type="button" className="btn" disabled={busy} onClick={turnOff}>
            {t('বন্ধ করুন', 'Turn off')}
          </button>
        </>
      ) : (
        <>
          <p className="muted">
            {t(
              'অর্ডার ও পেমেন্ট আপডেট আপনার ফোনে সিস্টেম নোটিফিকেশন হিসেবে পেতে চালু করুন।',
              'Get order and payment updates as system notifications on your phone.',
            )}
          </p>
          {denied ? (
            <p className="profile__phone-warn">
              {t(
                'নোটিফিকেশন ব্লক করা আছে — ব্রাউজার সেটিংস থেকে অনুমতি দিন।',
                'Notifications are blocked — please allow them in your browser settings.',
              )}
            </p>
          ) : (
            <button type="button" className="btn btn--brand" disabled={busy} onClick={turnOn}>
              {busy ? t('চালু হচ্ছে…', 'Enabling…') : t('নোটিফিকেশন চালু করুন', 'Enable notifications')}
            </button>
          )}
          {error && <p className="hint hint--err">{error}</p>}
          <p className="hint">
            {t(
              'আইফোনে: প্রথমে সাইটটি হোম স্ক্রিনে যোগ করুন, তারপর চালু করুন।',
              'On iPhone: add this site to your Home Screen first, then enable.',
            )}
          </p>
        </>
      )}
    </section>
  )
}

import { useEffect, useState, type FormEvent } from 'react'
import { fetchOrderingSetting, updateOrderingSetting, type OrderingSetting } from '../../lib/orders'
import { ApiError } from '../../lib/apiClient'
import { useI18n } from '../../context/LanguageContext'
import './Admin.css'

export function OrderingSettingsAdmin() {
  const { t } = useI18n()
  const [setting, setSetting] = useState<OrderingSetting | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchOrderingSetting()
      .then(setSetting)
      .catch(() => setError(t('সেটিংস লোড করা যায়নি', 'Could not load settings')))
      .finally(() => setLoading(false))
  }, [])

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!setting) return
    setError(null)
    setSaved(false)
    try {
      const updated = await updateOrderingSetting(setting)
      setSetting(updated)
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch (err) {
      if (err instanceof ApiError && err.details?.length) {
        setError(err.details.map((d) => d.message).join(' · '))
      } else {
        setError(err instanceof ApiError ? err.message : t('সংরক্ষণ করা যায়নি', 'Could not save'))
      }
    }
  }

  if (loading || !setting) return <p className="muted">{t('লোড হচ্ছে…', 'Loading…')}</p>

  return (
    <section>
      <h1>{t('অর্ডার সেটিংস', 'Ordering settings')}</h1>
      <p className="muted">{t('অগ্রিম অর্ডারের কাটঅফ সময় ও ডেলিভারি চার্জ কনফিগার করুন।', 'Configure pre-order cutoff time and delivery charge.')}</p>
      <form className="admin-form" onSubmit={handleSubmit}>
        {error && <div className="auth-error">{error}</div>}
        <div className="admin-form__row">
          <label>
            {t('কাটঅফ সময় (HH:mm)', 'Cutoff time (HH:mm)')}
            <input
              value={setting.cutoffTime}
              onChange={(e) => setSetting({ ...setting, cutoffTime: e.target.value })}
              placeholder="22:00"
              required
            />
          </label>
          <label>
            {t('সর্বনিম্ন অগ্রিম দিন', 'Minimum advance days')}
            <input
              type="number"
              min={0}
              max={30}
              value={setting.minAdvanceDays}
              onChange={(e) => setSetting({ ...setting, minAdvanceDays: Number(e.target.value) })}
              required
            />
          </label>
        </div>
        <div className="admin-form__row">
          <label>
            {t('ডিফল্ট ডেলিভারি চার্জ (৳)', 'Default delivery charge (৳)')}
            <input
              type="number"
              min={0}
              step="0.01"
              value={setting.defaultDeliveryCost}
              onChange={(e) => setSetting({ ...setting, defaultDeliveryCost: Number(e.target.value) })}
              required
            />
          </label>
          <label>
            {t('টাইমজোন', 'Timezone')}
            <input
              value={setting.timezone}
              onChange={(e) => setSetting({ ...setting, timezone: e.target.value })}
              required
            />
          </label>
        </div>
        <div className="admin-form__actions">
          <button type="submit">{t('সংরক্ষণ করুন', 'Save')}</button>
          {saved && <span className="hint" style={{ color: '#b07d10', fontWeight: 600 }}>{t('সংরক্ষিত হয়েছে', 'Saved')}</span>}
        </div>
      </form>
    </section>
  )
}

import { useEffect, useState, type FormEvent } from 'react'
import { fetchOrderingSetting, updateOrderingSetting, type OrderingSetting } from '../../lib/orders'
import { ApiError } from '../../lib/apiClient'
import './Admin.css'

export function OrderingSettingsAdmin() {
  const [setting, setSetting] = useState<OrderingSetting | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchOrderingSetting()
      .then(setSetting)
      .catch(() => setError('সেটিংস লোড করা যায়নি'))
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
        setError(err instanceof ApiError ? err.message : 'সংরক্ষণ করা যায়নি')
      }
    }
  }

  if (loading || !setting) return <p className="muted">লোড হচ্ছে…</p>

  return (
    <section>
      <h1>অর্ডার সেটিংস</h1>
      <p className="muted">অগ্রিম অর্ডারের কাটঅফ সময় ও ডেলিভারি চার্জ কনফিগার করুন।</p>
      <form className="admin-form" onSubmit={handleSubmit}>
        {error && <div className="auth-error">{error}</div>}
        <div className="admin-form__row">
          <label>
            কাটঅফ সময় (HH:mm)
            <input
              value={setting.cutoffTime}
              onChange={(e) => setSetting({ ...setting, cutoffTime: e.target.value })}
              placeholder="22:00"
              required
            />
          </label>
          <label>
            সর্বনিম্ন অগ্রিম দিন
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
            ডিফল্ট ডেলিভারি চার্জ (৳)
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
            টাইমজোন
            <input
              value={setting.timezone}
              onChange={(e) => setSetting({ ...setting, timezone: e.target.value })}
              required
            />
          </label>
        </div>
        <div className="admin-form__actions">
          <button type="submit">সংরক্ষণ করুন</button>
          {saved && <span className="hint" style={{ color: '#2f5233', fontWeight: 600 }}>সংরক্ষিত হয়েছে</span>}
        </div>
      </form>
    </section>
  )
}

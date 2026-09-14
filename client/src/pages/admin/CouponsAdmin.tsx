import { useEffect, useState, useCallback, type FormEvent } from 'react'
import { createCoupon, deleteCoupon, fetchCoupons } from '../../lib/orders'
import { ApiError } from '../../lib/apiClient'
import { useI18n } from '../../context/LanguageContext'
import { pick } from '../../lib/i18n'
import type { Coupon, CouponKind, CouponScope } from '../../types/order'
import './Admin.css'

const scopeLabel: Record<CouponScope, string> = {
  get FOOD() {
    return pick('ফুড', 'Food')
  },
  get DELIVERY() {
    return pick('ডেলিভারি', 'Delivery')
  },
}
const kindLabel: Record<CouponKind, string> = {
  get PERCENT() {
    return pick('শতাংশ', 'Percent')
  },
  get FIXED() {
    return pick('নির্দিষ্ট', 'Fixed')
  },
  get FREE_DELIVERY() {
    return pick('ফ্রি ডেলিভারি', 'Free delivery')
  },
}

const emptyForm = {
  code: '',
  scope: 'FOOD' as CouponScope,
  kind: 'PERCENT' as CouponKind,
  value: '',
  minOrderSubtotal: '',
  description: '',
}

export function CouponsAdmin() {
  const { t } = useI18n()
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [form, setForm] = useState(emptyForm)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const reload = useCallback(async () => {
    setLoading(true)
    try {
      setCoupons(await fetchCoupons())
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void reload()
  }, [reload])

  async function handleCreate(event: FormEvent) {
    event.preventDefault()
    setError(null)
    try {
      await createCoupon({
        code: form.code,
        scope: form.scope,
        kind: form.kind,
        value: form.kind === 'FREE_DELIVERY' ? undefined : Number(form.value),
        minOrderSubtotal: form.minOrderSubtotal ? Number(form.minOrderSubtotal) : undefined,
        description: form.description || undefined,
      })
      setForm(emptyForm)
      await reload()
    } catch (err) {
      if (err instanceof ApiError && err.details?.length) setError(err.details.map((d) => d.message).join(' · '))
      else setError(err instanceof ApiError ? err.message : t('তৈরি করা যায়নি', 'Could not create'))
    }
  }

  async function handleDelete(c: Coupon) {
    if (!window.confirm(t(`কুপন "${c.code}" মুছবেন?`, `Delete coupon "${c.code}"?`))) return
    await deleteCoupon(c.id)
    await reload()
  }

  return (
    <section>
      <h1>{t('কুপন ব্যবস্থাপনা', 'Coupon management')}</h1>

      <form className="admin-form" onSubmit={handleCreate}>
        <h2>{t('নতুন কুপন', 'New coupon')}</h2>
        {error && <div className="auth-error">{error}</div>}
        <div className="admin-form__row">
          <label>
            {t('কোড', 'Code')}
            <input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} required />
          </label>
          <label>
            {t('স্কোপ', 'Scope')}
            <select value={form.scope} onChange={(e) => setForm({ ...form, scope: e.target.value as CouponScope })}>
              <option value="FOOD">{t('ফুড', 'Food')}</option>
              <option value="DELIVERY">{t('ডেলিভারি', 'Delivery')}</option>
            </select>
          </label>
          <label>
            {t('ধরন', 'Type')}
            <select value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value as CouponKind })}>
              <option value="PERCENT">{t('শতাংশ (%)', 'Percent (%)')}</option>
              <option value="FIXED">{t('নির্দিষ্ট (৳)', 'Fixed (৳)')}</option>
              <option value="FREE_DELIVERY">{t('ফ্রি ডেলিভারি', 'Free delivery')}</option>
            </select>
          </label>
        </div>
        <div className="admin-form__row">
          {form.kind !== 'FREE_DELIVERY' && (
            <label>
              {t('মান', 'Value')} ({form.kind === 'PERCENT' ? '%' : '৳'})
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.value}
                onChange={(e) => setForm({ ...form, value: e.target.value })}
                required
              />
            </label>
          )}
          <label>
            {t('সর্বনিম্ন ফুড সাবটোটাল (৳)', 'Minimum food subtotal (৳)')}
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.minOrderSubtotal}
              onChange={(e) => setForm({ ...form, minOrderSubtotal: e.target.value })}
            />
          </label>
          <label>
            {t('বিবরণ', 'Description')}
            <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </label>
        </div>
        <div className="admin-form__actions">
          <button type="submit">{t('তৈরি করুন', 'Create')}</button>
        </div>
      </form>

      {loading ? (
        <p className="muted">{t('লোড হচ্ছে…', 'Loading…')}</p>
      ) : (
        <div className="table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>{t('কোড', 'Code')}</th>
                <th>{t('স্কোপ', 'Scope')}</th>
                <th>{t('ধরন', 'Type')}</th>
                <th>{t('মান', 'Value')}</th>
                <th>{t('সর্বনিম্ন', 'Minimum')}</th>
                <th>{t('সক্রিয়', 'Active')}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {coupons.map((c) => (
                <tr key={c.id}>
                  <td><strong>{c.code}</strong></td>
                  <td>{scopeLabel[c.scope]}</td>
                  <td>{kindLabel[c.kind]}</td>
                  <td>{c.kind === 'FREE_DELIVERY' ? '—' : c.kind === 'PERCENT' ? `${c.value}%` : `৳${c.value}`}</td>
                  <td>{c.minOrderSubtotal > 0 ? `৳${c.minOrderSubtotal}` : '—'}</td>
                  <td>{c.isActive ? t('হ্যাঁ', 'Yes') : t('না', 'No')}</td>
                  <td className="admin-table__actions">
                    <button className="btn-danger" onClick={() => handleDelete(c)}>{t('মুছুন', 'Delete')}</button>
                  </td>
                </tr>
              ))}
              {coupons.length === 0 && (
                <tr>
                  <td colSpan={7} className="muted">{t('কোনো কুপন নেই।', 'No coupons yet.')}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

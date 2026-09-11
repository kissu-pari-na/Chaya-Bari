import { useEffect, useState, useCallback, type FormEvent } from 'react'
import { createCoupon, deleteCoupon, fetchCoupons } from '../../lib/orders'
import { ApiError } from '../../lib/apiClient'
import type { Coupon, CouponKind, CouponScope } from '../../types/order'
import './Admin.css'

const scopeLabel: Record<CouponScope, string> = { FOOD: 'ফুড', DELIVERY: 'ডেলিভারি' }
const kindLabel: Record<CouponKind, string> = {
  PERCENT: 'শতাংশ',
  FIXED: 'নির্দিষ্ট',
  FREE_DELIVERY: 'ফ্রি ডেলিভারি',
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
      else setError(err instanceof ApiError ? err.message : 'তৈরি করা যায়নি')
    }
  }

  async function handleDelete(c: Coupon) {
    if (!window.confirm(`কুপন "${c.code}" মুছবেন?`)) return
    await deleteCoupon(c.id)
    await reload()
  }

  return (
    <section>
      <h1>কুপন ব্যবস্থাপনা</h1>

      <form className="admin-form" onSubmit={handleCreate}>
        <h2>নতুন কুপন</h2>
        {error && <div className="auth-error">{error}</div>}
        <div className="admin-form__row">
          <label>
            কোড
            <input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} required />
          </label>
          <label>
            স্কোপ
            <select value={form.scope} onChange={(e) => setForm({ ...form, scope: e.target.value as CouponScope })}>
              <option value="FOOD">ফুড</option>
              <option value="DELIVERY">ডেলিভারি</option>
            </select>
          </label>
          <label>
            ধরন
            <select value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value as CouponKind })}>
              <option value="PERCENT">শতাংশ (%)</option>
              <option value="FIXED">নির্দিষ্ট (৳)</option>
              <option value="FREE_DELIVERY">ফ্রি ডেলিভারি</option>
            </select>
          </label>
        </div>
        <div className="admin-form__row">
          {form.kind !== 'FREE_DELIVERY' && (
            <label>
              মান ({form.kind === 'PERCENT' ? '%' : '৳'})
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
            সর্বনিম্ন ফুড সাবটোটাল (৳)
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.minOrderSubtotal}
              onChange={(e) => setForm({ ...form, minOrderSubtotal: e.target.value })}
            />
          </label>
          <label>
            বিবরণ
            <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </label>
        </div>
        <div className="admin-form__actions">
          <button type="submit">তৈরি করুন</button>
        </div>
      </form>

      {loading ? (
        <p className="muted">লোড হচ্ছে…</p>
      ) : (
        <div className="table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>কোড</th>
                <th>স্কোপ</th>
                <th>ধরন</th>
                <th>মান</th>
                <th>সর্বনিম্ন</th>
                <th>সক্রিয়</th>
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
                  <td>{c.isActive ? 'হ্যাঁ' : 'না'}</td>
                  <td className="admin-table__actions">
                    <button className="btn-danger" onClick={() => handleDelete(c)}>মুছুন</button>
                  </td>
                </tr>
              ))}
              {coupons.length === 0 && (
                <tr>
                  <td colSpan={7} className="muted">কোনো কুপন নেই।</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

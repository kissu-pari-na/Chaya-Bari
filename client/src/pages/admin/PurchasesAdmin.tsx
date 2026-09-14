import { useEffect, useState, useCallback, type FormEvent } from 'react'
import { createPurchase, fetchMaterials, fetchPurchases } from '../../lib/inventory'
import { formatBdt } from '../../lib/format'
import { ApiError } from '../../lib/apiClient'
import { useI18n } from '../../context/LanguageContext'
import type { Material, Purchase } from '../../types/inventory'
import './Admin.css'

interface Line {
  materialId: string
  quantity: string
  totalCost: string
}

export function PurchasesAdmin() {
  const { t } = useI18n()
  const [materials, setMaterials] = useState<Material[]>([])
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [supplier, setSupplier] = useState('')
  const [lines, setLines] = useState<Line[]>([{ materialId: '', quantity: '', totalCost: '' }])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const reload = useCallback(async () => {
    const [m, p] = await Promise.all([fetchMaterials(), fetchPurchases()])
    setMaterials(m)
    setPurchases(p)
    setLoading(false)
  }, [])

  useEffect(() => {
    void reload()
  }, [reload])

  function setLine(idx: number, patch: Partial<Line>) {
    setLines((ls) => ls.map((l, i) => (i === idx ? { ...l, ...patch } : l)))
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    const items = lines
      .filter((l) => l.materialId && l.quantity && l.totalCost)
      .map((l) => ({ materialId: l.materialId, quantity: Number(l.quantity), totalCost: Number(l.totalCost) }))
    if (items.length === 0) {
      setError(t('অন্তত একটি বৈধ লাইন দরকার', 'At least one valid line is required'))
      return
    }
    try {
      await createPurchase({ supplier: supplier || undefined, items })
      setSupplier('')
      setLines([{ materialId: '', quantity: '', totalCost: '' }])
      await reload()
    } catch (err) {
      if (err instanceof ApiError && err.details?.length) setError(err.details.map((d) => d.message).join(' · '))
      else setError(err instanceof ApiError ? err.message : t('সংরক্ষণ করা যায়নি', 'Could not save'))
    }
  }

  const unitFor = (id: string) => materials.find((m) => m.id === id)?.unit ?? ''

  return (
    <section>
      <h1>{t('ক্রয় (Purchases)', 'Purchases')}</h1>

      <form className="admin-form" onSubmit={handleSubmit} style={{ maxWidth: 640 }}>
        <h2>{t('নতুন ক্রয় রেকর্ড', 'New purchase record')}</h2>
        {error && <div className="auth-error">{error}</div>}
        <label>
          {t('সরবরাহকারী (ঐচ্ছিক)', 'Supplier (optional)')}
          <input value={supplier} onChange={(e) => setSupplier(e.target.value)} />
        </label>

        {lines.map((line, idx) => (
          <div className="admin-form__row" key={idx}>
            <label>
              {t('উপকরণ', 'Material')}
              <select value={line.materialId} onChange={(e) => setLine(idx, { materialId: e.target.value })}>
                <option value="">{t('— নির্বাচন —', '— Select —')}</option>
                {materials.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.unit})
                  </option>
                ))}
              </select>
            </label>
            <label>
              {t('পরিমাণ', 'Quantity')} {line.materialId ? `(${unitFor(line.materialId)})` : ''}
              <input type="number" min="0" step="0.001" value={line.quantity} onChange={(e) => setLine(idx, { quantity: e.target.value })} />
            </label>
            <label>
              {t('মোট খরচ (৳)', 'Total cost (৳)')}
              <input type="number" min="0" step="0.01" value={line.totalCost} onChange={(e) => setLine(idx, { totalCost: e.target.value })} />
            </label>
          </div>
        ))}
        <div className="admin-form__actions">
          <button type="button" className="btn-ghost" onClick={() => setLines((ls) => [...ls, { materialId: '', quantity: '', totalCost: '' }])}>
            + {t('লাইন যোগ', 'Add line')}
          </button>
          <button type="submit">{t('ক্রয় সংরক্ষণ', 'Save purchase')}</button>
        </div>
      </form>

      <h2>{t('সাম্প্রতিক ক্রয়', 'Recent purchases')}</h2>
      {loading ? (
        <p className="muted">{t('লোড হচ্ছে…', 'Loading…')}</p>
      ) : (
        <div className="table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>{t('তারিখ', 'Date')}</th>
                <th>{t('সরবরাহকারী', 'Supplier')}</th>
                <th>{t('আইটেম', 'Items')}</th>
                <th>{t('মোট', 'Total')}</th>
              </tr>
            </thead>
            <tbody>
              {purchases.map((p) => (
                <tr key={p.id}>
                  <td>{p.purchasedAt.slice(0, 10)}</td>
                  <td>{p.supplier ?? '—'}</td>
                  <td>{p.items.map((i) => `${i.materialName} ${i.quantity}${i.unit}`).join(', ')}</td>
                  <td>{formatBdt(p.totalCost)}</td>
                </tr>
              ))}
              {purchases.length === 0 && (
                <tr>
                  <td colSpan={4} className="muted">{t('কোনো ক্রয় নেই।', 'No purchases yet.')}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

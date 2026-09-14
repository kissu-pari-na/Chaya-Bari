import { useEffect, useState, useCallback, type FormEvent } from 'react'
import { adjustStock, createMaterial, deleteMaterial, fetchMaterials } from '../../lib/inventory'
import { formatBdt } from '../../lib/format'
import { ApiError } from '../../lib/apiClient'
import { useI18n } from '../../context/LanguageContext'
import { pick } from '../../lib/i18n'
import type { Material, MaterialKind } from '../../types/inventory'
import './Admin.css'

const kindLabel: Record<MaterialKind, string> = {
  get INGREDIENT() {
    return pick('উপকরণ', 'Ingredient')
  },
  get PACKAGING() {
    return pick('প্যাকেজিং', 'Packaging')
  },
}

const emptyForm = { name: '', kind: 'INGREDIENT' as MaterialKind, unit: '' }

export function MaterialsAdmin() {
  const { t } = useI18n()
  const [materials, setMaterials] = useState<Material[]>([])
  const [form, setForm] = useState(emptyForm)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const reload = useCallback(async () => {
    setLoading(true)
    try {
      setMaterials(await fetchMaterials())
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
      await createMaterial(form)
      setForm(emptyForm)
      await reload()
    } catch (err) {
      if (err instanceof ApiError && err.details?.length) setError(err.details.map((d) => d.message).join(' · '))
      else setError(err instanceof ApiError ? err.message : t('যোগ করা যায়নি', 'Could not add'))
    }
  }

  async function handleAdjust(m: Material) {
    const input = window.prompt(t(`"${m.name}" স্টক সমন্বয় (${m.unit}) — যোগ করতে ধনাত্মক, কমাতে ঋণাত্মক:`, `Adjust "${m.name}" stock (${m.unit}) — positive to add, negative to reduce:`))
    if (input == null) return
    const delta = Number(input)
    if (!Number.isFinite(delta) || delta === 0) return
    try {
      await adjustStock(m.id, delta)
      await reload()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('সমন্বয় করা যায়নি', 'Could not adjust'))
    }
  }

  async function handleDelete(m: Material) {
    if (!window.confirm(t(`"${m.name}" মুছবেন?`, `Delete "${m.name}"?`))) return
    try {
      await deleteMaterial(m.id)
      await reload()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('মোছা যায়নি', 'Could not delete'))
    }
  }

  return (
    <section>
      <h1>{t('ইনভেন্টরি (উপকরণ ও প্যাকেজিং)', 'Inventory (ingredients & packaging)')}</h1>

      <form className="admin-form" onSubmit={handleCreate}>
        <h2>{t('নতুন উপকরণ', 'New material')}</h2>
        {error && <div className="auth-error">{error}</div>}
        <div className="admin-form__row">
          <label>
            {t('নাম', 'Name')}
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </label>
          <label>
            {t('ধরন', 'Type')}
            <select value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value as MaterialKind })}>
              <option value="INGREDIENT">{t('উপকরণ', 'Ingredient')}</option>
              <option value="PACKAGING">{t('প্যাকেজিং', 'Packaging')}</option>
            </select>
          </label>
          <label>
            {t('একক (kg, L, pcs…)', 'Unit (kg, L, pcs…)')}
            <input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} required />
          </label>
        </div>
        <div className="admin-form__actions">
          <button type="submit">{t('যোগ করুন', 'Add')}</button>
        </div>
      </form>

      {loading ? (
        <p className="muted">{t('লোড হচ্ছে…', 'Loading…')}</p>
      ) : (
        <div className="table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>{t('নাম', 'Name')}</th>
                <th>{t('ধরন', 'Type')}</th>
                <th>{t('একক', 'Unit')}</th>
                <th>{t('স্টক', 'Stock')}</th>
                <th>{t('গড় একক খরচ', 'Avg unit cost')}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {materials.map((m) => (
                <tr key={m.id}>
                  <td>{m.name}</td>
                  <td>{kindLabel[m.kind]}</td>
                  <td>{m.unit}</td>
                  <td>{m.stockQty} {m.unit}</td>
                  <td>{formatBdt(m.avgUnitCost)}</td>
                  <td className="admin-table__actions">
                    <button className="btn-ghost" onClick={() => handleAdjust(m)}>{t('সমন্বয়', 'Adjust')}</button>
                    <button className="btn-danger" onClick={() => handleDelete(m)}>{t('মুছুন', 'Delete')}</button>
                  </td>
                </tr>
              ))}
              {materials.length === 0 && (
                <tr>
                  <td colSpan={6} className="muted">{t('কোনো উপকরণ নেই।', 'No materials yet.')}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

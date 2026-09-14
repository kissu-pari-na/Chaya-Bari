import { useEffect, useState, useCallback, type FormEvent } from 'react'
import { adjustStock, createMaterial, deleteMaterial, fetchMaterials } from '../../lib/inventory'
import { formatBdt } from '../../lib/format'
import { ApiError } from '../../lib/apiClient'
import type { Material, MaterialKind } from '../../types/inventory'
import './Admin.css'

const kindLabel: Record<MaterialKind, string> = { INGREDIENT: 'উপকরণ', PACKAGING: 'প্যাকেজিং' }

const emptyForm = { name: '', kind: 'INGREDIENT' as MaterialKind, unit: '' }

export function MaterialsAdmin() {
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
      else setError(err instanceof ApiError ? err.message : 'যোগ করা যায়নি')
    }
  }

  async function handleAdjust(m: Material) {
    const input = window.prompt(`"${m.name}" স্টক সমন্বয় (${m.unit}) — যোগ করতে ধনাত্মক, কমাতে ঋণাত্মক:`)
    if (input == null) return
    const delta = Number(input)
    if (!Number.isFinite(delta) || delta === 0) return
    try {
      await adjustStock(m.id, delta)
      await reload()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'সমন্বয় করা যায়নি')
    }
  }

  async function handleDelete(m: Material) {
    if (!window.confirm(`"${m.name}" মুছবেন?`)) return
    try {
      await deleteMaterial(m.id)
      await reload()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'মোছা যায়নি')
    }
  }

  return (
    <section>
      <h1>ইনভেন্টরি (উপকরণ ও প্যাকেজিং)</h1>

      <form className="admin-form" onSubmit={handleCreate}>
        <h2>নতুন উপকরণ</h2>
        {error && <div className="auth-error">{error}</div>}
        <div className="admin-form__row">
          <label>
            নাম
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </label>
          <label>
            ধরন
            <select value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value as MaterialKind })}>
              <option value="INGREDIENT">উপকরণ</option>
              <option value="PACKAGING">প্যাকেজিং</option>
            </select>
          </label>
          <label>
            একক (kg, L, pcs…)
            <input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} required />
          </label>
        </div>
        <div className="admin-form__actions">
          <button type="submit">যোগ করুন</button>
        </div>
      </form>

      {loading ? (
        <p className="muted">লোড হচ্ছে…</p>
      ) : (
        <div className="table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>নাম</th>
                <th>ধরন</th>
                <th>একক</th>
                <th>স্টক</th>
                <th>গড় একক খরচ</th>
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
                    <button className="btn-ghost" onClick={() => handleAdjust(m)}>সমন্বয়</button>
                    <button className="btn-danger" onClick={() => handleDelete(m)}>মুছুন</button>
                  </td>
                </tr>
              ))}
              {materials.length === 0 && (
                <tr>
                  <td colSpan={6} className="muted">কোনো উপকরণ নেই।</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

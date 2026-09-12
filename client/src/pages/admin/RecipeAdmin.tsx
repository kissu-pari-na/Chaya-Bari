import { useEffect, useState, useCallback, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { deleteRecipe, fetchMaterials, fetchRecipe, saveRecipe } from '../../lib/inventory'
import { formatBdt } from '../../lib/format'
import { ApiError } from '../../lib/apiClient'
import type { Material, Recipe } from '../../types/inventory'
import './Admin.css'

interface Line {
  materialId: string
  quantity: string
}

export function RecipeAdmin() {
  const { id: productId } = useParams<{ id: string }>()
  const [materials, setMaterials] = useState<Material[]>([])
  const [recipe, setRecipe] = useState<Recipe | null>(null)
  const [productName, setProductName] = useState('')
  const [yieldQty, setYieldQty] = useState('1')
  const [lines, setLines] = useState<Line[]>([{ materialId: '', quantity: '' }])
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!productId) return
    const [mats, rec] = await Promise.all([fetchMaterials(), fetchRecipe(productId)])
    setMaterials(mats)
    if (rec) {
      setRecipe(rec)
      setProductName(rec.productName)
      setYieldQty(String(rec.yieldQty))
      setLines(rec.items.map((i) => ({ materialId: i.materialId, quantity: String(i.quantity) })))
    }
    setLoading(false)
  }, [productId])

  useEffect(() => {
    void load()
  }, [load])

  function setLine(idx: number, patch: Partial<Line>) {
    setLines((ls) => ls.map((l, i) => (i === idx ? { ...l, ...patch } : l)))
  }

  async function handleSave(event: FormEvent) {
    event.preventDefault()
    if (!productId) return
    setError(null)
    setSaved(false)
    const items = lines
      .filter((l) => l.materialId && l.quantity)
      .map((l) => ({ materialId: l.materialId, quantity: Number(l.quantity) }))
    if (items.length === 0) {
      setError('অন্তত একটি উপকরণ দরকার')
      return
    }
    try {
      const rec = await saveRecipe(productId, { yieldQty: Number(yieldQty), items })
      setRecipe(rec)
      setProductName(rec.productName)
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch (err) {
      if (err instanceof ApiError && err.details?.length) setError(err.details.map((d) => d.message).join(' · '))
      else setError(err instanceof ApiError ? err.message : 'সংরক্ষণ করা যায়নি')
    }
  }

  async function handleDelete() {
    if (!productId || !recipe) return
    if (!window.confirm('রেসিপি মুছবেন?')) return
    await deleteRecipe(productId)
    setRecipe(null)
    setYieldQty('1')
    setLines([{ materialId: '', quantity: '' }])
  }

  const unitFor = (mid: string) => materials.find((m) => m.id === mid)?.unit ?? ''

  if (loading) return <p className="muted">লোড হচ্ছে…</p>

  const c = recipe?.costing

  return (
    <section>
      <Link to="/admin/costing" className="product-detail__back">← কস্টিং</Link>
      <h1>রেসিপি{productName ? ` — ${productName}` : ''}</h1>

      <form className="admin-form" onSubmit={handleSave} style={{ maxWidth: 640 }}>
        {error && <div className="auth-error">{error}</div>}
        <label>
          ইল্ড (এক ব্যাচে কত ইউনিট তৈরি হয়)
          <input type="number" min="1" value={yieldQty} onChange={(e) => setYieldQty(e.target.value)} required />
        </label>

        {lines.map((line, idx) => (
          <div className="admin-form__row" key={idx}>
            <label>
              উপকরণ / প্যাকেজিং
              <select value={line.materialId} onChange={(e) => setLine(idx, { materialId: e.target.value })}>
                <option value="">— নির্বাচন —</option>
                {materials.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.unit}) · {formatBdt(m.avgUnitCost)}/{m.unit}
                  </option>
                ))}
              </select>
            </label>
            <label>
              পরিমাণ {line.materialId ? `(${unitFor(line.materialId)})` : ''}
              <input type="number" min="0" step="0.001" value={line.quantity} onChange={(e) => setLine(idx, { quantity: e.target.value })} />
            </label>
            <button type="button" className="btn-danger" style={{ alignSelf: 'end', marginBottom: '0.6rem' }} onClick={() => setLines((ls) => ls.filter((_, i) => i !== idx))}>
              ✕
            </button>
          </div>
        ))}
        <div className="admin-form__actions">
          <button type="button" className="btn-ghost" onClick={() => setLines((ls) => [...ls, { materialId: '', quantity: '' }])}>
            + উপকরণ
          </button>
          <button type="submit">সংরক্ষণ করুন</button>
          {recipe && (
            <button type="button" className="btn-danger" onClick={handleDelete}>
              রেসিপি মুছুন
            </button>
          )}
          {saved && <span className="hint" style={{ color: '#2f5233', fontWeight: 600 }}>সংরক্ষিত</span>}
        </div>
      </form>

      {c && (
        <div className="delivery-costs" style={{ marginTop: '1rem' }}>
          <div>
            <span className="delivery-costs__label">উপকরণ খরচ (ব্যাচ)</span>
            <span className="delivery-costs__value">{formatBdt(c.ingredientCost)}</span>
          </div>
          <div>
            <span className="delivery-costs__label">প্যাকেজিং খরচ (ব্যাচ)</span>
            <span className="delivery-costs__value">{formatBdt(c.packagingCost)}</span>
          </div>
          <div>
            <span className="delivery-costs__label">প্রতি ইউনিট খরচ</span>
            <span className="delivery-costs__value">{formatBdt(c.costPerUnit)}</span>
          </div>
          <div>
            <span className="delivery-costs__label">গ্রস প্রফিট / ইউনিট</span>
            <span className={c.grossProfitPerUnit >= 0 ? 'delivery-costs__value delivery-gain' : 'delivery-costs__value delivery-loss'}>
              {formatBdt(c.grossProfitPerUnit)}
              {c.marginPct != null ? ` (${c.marginPct.toFixed(1)}%)` : ''}
            </span>
          </div>
        </div>
      )}
    </section>
  )
}

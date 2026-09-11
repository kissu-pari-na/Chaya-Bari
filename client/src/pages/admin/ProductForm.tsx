import { useState, type FormEvent } from 'react'
import type { Category, Product, ProductInput } from '../../types/product'
import { ApiError } from '../../lib/apiClient'

interface ProductFormProps {
  categories: Category[]
  initial?: Product
  onSubmit: (input: ProductInput) => Promise<void>
  onCancel: () => void
}

export function ProductForm({ categories, initial, onSubmit, onCancel }: ProductFormProps) {
  const [name, setName] = useState(initial?.name ?? '')
  const [price, setPrice] = useState(initial ? String(initial.price) : '')
  const [categoryId, setCategoryId] = useState(initial?.categoryId ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [imageUrl, setImageUrl] = useState(initial?.imageUrl ?? '')
  const [prepInfo, setPrepInfo] = useState(initial?.prepInfo ?? '')
  const [isActive, setIsActive] = useState(initial?.isActive ?? true)
  const [isAvailable, setIsAvailable] = useState(initial?.isAvailable ?? true)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    const priceNum = Number(price)
    if (!Number.isFinite(priceNum) || priceNum <= 0) {
      setError('মূল্য অবশ্যই ০-এর বেশি হতে হবে')
      return
    }
    setSubmitting(true)
    try {
      await onSubmit({
        name,
        price: priceNum,
        categoryId: categoryId || undefined,
        description: description || undefined,
        imageUrl: imageUrl || undefined,
        prepInfo: prepInfo || undefined,
        isActive,
        isAvailable,
      })
    } catch (err) {
      if (err instanceof ApiError && err.details?.length) {
        setError(err.details.map((d) => d.message).join(' · '))
      } else {
        setError(err instanceof ApiError ? err.message : 'সংরক্ষণ করা যায়নি')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form className="admin-form" onSubmit={handleSubmit}>
      <h2>{initial ? 'পণ্য সম্পাদনা' : 'নতুন পণ্য'}</h2>
      {error && <div className="auth-error">{error}</div>}
      <label>
        নাম
        <input value={name} onChange={(e) => setName(e.target.value)} required maxLength={150} />
      </label>
      <div className="admin-form__row">
        <label>
          মূল্য (৳)
          <input type="number" min="0" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} required />
        </label>
        <label>
          ক্যাটাগরি
          <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            <option value="">— নেই —</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label>
        বিবরণ
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} maxLength={2000} />
      </label>
      <label>
        ছবি URL
        <input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://…" />
      </label>
      <label>
        প্রস্তুতি তথ্য
        <input value={prepInfo} onChange={(e) => setPrepInfo(e.target.value)} maxLength={2000} />
      </label>
      <div className="admin-form__row">
        <label className="admin-form__check">
          <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
          সক্রিয় (ক্যাটালগে দৃশ্যমান)
        </label>
        <label className="admin-form__check">
          <input type="checkbox" checked={isAvailable} onChange={(e) => setIsAvailable(e.target.checked)} />
          অর্ডারের জন্য উপলব্ধ
        </label>
      </div>
      <div className="admin-form__actions">
        <button type="submit" disabled={submitting}>
          {submitting ? 'সংরক্ষণ হচ্ছে…' : 'সংরক্ষণ করুন'}
        </button>
        <button type="button" className="btn-ghost" onClick={onCancel}>
          বাতিল
        </button>
      </div>
    </form>
  )
}

import { useState, type FormEvent } from 'react'
import type { Category, Product, ProductInput } from '../../types/product'
import { ApiError } from '../../lib/apiClient'
import { useI18n } from '../../context/LanguageContext'

interface ProductFormProps {
  categories: Category[]
  initial?: Product
  onSubmit: (input: ProductInput) => Promise<void>
  onCancel: () => void
}

export function ProductForm({ categories, initial, onSubmit, onCancel }: ProductFormProps) {
  const { t } = useI18n()
  const [name, setName] = useState(initial?.name ?? '')
  const [price, setPrice] = useState(initial ? String(initial.price) : '')
  const [salePrice, setSalePrice] = useState(initial?.salePrice != null ? String(initial.salePrice) : '')
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
      setError(t('মূল্য অবশ্যই ০-এর বেশি হতে হবে', 'Price must be greater than 0'))
      return
    }
    const saleNum = salePrice.trim() === '' ? null : Number(salePrice)
    if (saleNum != null && (!Number.isFinite(saleNum) || saleNum <= 0 || saleNum >= priceNum)) {
      setError(t('অফার মূল্য নিয়মিত মূল্যের চেয়ে কম হতে হবে', 'Sale price must be below the regular price'))
      return
    }
    setSubmitting(true)
    try {
      await onSubmit({
        name,
        price: priceNum,
        salePrice: saleNum,
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
        setError(err instanceof ApiError ? err.message : t('সংরক্ষণ করা যায়নি', 'Could not save'))
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form className="admin-form" onSubmit={handleSubmit}>
      <h2>{initial ? t('পণ্য সম্পাদনা', 'Edit product') : t('নতুন পণ্য', 'New product')}</h2>
      {error && <div className="auth-error">{error}</div>}
      <label>
        {t('নাম', 'Name')}
        <input value={name} onChange={(e) => setName(e.target.value)} required maxLength={150} />
      </label>
      <div className="admin-form__row">
        <label>
          {t('মূল্য (৳)', 'Price (৳)')}
          <input type="number" min="0" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} required />
        </label>
        <label>
          {t('অফার মূল্য (৳, ঐচ্ছিক)', 'Sale price (৳, optional)')}
          <input
            type="number"
            min="0"
            step="0.01"
            value={salePrice}
            onChange={(e) => setSalePrice(e.target.value)}
            placeholder={t('ছাড় থাকলে', 'If discounted')}
          />
        </label>
      </div>
      <div className="admin-form__row">
        <label>
          {t('ক্যাটাগরি', 'Category')}
          <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            <option value="">{t('— নেই —', '— None —')}</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label>
        {t('বিবরণ', 'Description')}
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} maxLength={2000} />
      </label>
      <label>
        {t('ছবি URL', 'Image URL')}
        <input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://…" />
      </label>
      <label>
        {t('প্রস্তুতি তথ্য', 'Prep info')}
        <input value={prepInfo} onChange={(e) => setPrepInfo(e.target.value)} maxLength={2000} />
      </label>
      <div className="admin-form__row">
        <label className="admin-form__check">
          <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
          {t('সক্রিয় (ক্যাটালগে দৃশ্যমান)', 'Active (visible in catalog)')}
        </label>
        <label className="admin-form__check">
          <input type="checkbox" checked={isAvailable} onChange={(e) => setIsAvailable(e.target.checked)} />
          {t('অর্ডারের জন্য উপলব্ধ', 'Available to order')}
        </label>
      </div>
      <div className="admin-form__actions">
        <button type="submit" disabled={submitting}>
          {submitting ? t('সংরক্ষণ হচ্ছে…', 'Saving…') : t('সংরক্ষণ করুন', 'Save')}
        </button>
        <button type="button" className="btn-ghost" onClick={onCancel}>
          {t('বাতিল', 'Cancel')}
        </button>
      </div>
    </form>
  )
}

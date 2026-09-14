import { useEffect, useState, useCallback, type FormEvent } from 'react'
import {
  createCategory,
  deleteCategory,
  fetchAdminCategories,
  updateCategory,
} from '../../lib/products'
import type { Category } from '../../types/product'
import { ApiError } from '../../lib/apiClient'
import { useI18n } from '../../context/LanguageContext'
import './Admin.css'

export function CategoriesAdmin() {
  const { t } = useI18n()
  const [categories, setCategories] = useState<Category[]>([])
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    setLoading(true)
    try {
      setCategories(await fetchAdminCategories())
      setError(null)
    } catch {
      setError(t('ক্যাটাগরি লোড করা যায়নি', 'Could not load categories'))
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => {
    void reload()
  }, [reload])

  async function handleCreate(event: FormEvent) {
    event.preventDefault()
    if (!name.trim()) return
    setError(null)
    try {
      await createCategory({ name: name.trim(), sortOrder: categories.length + 1 })
      setName('')
      await reload()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('যোগ করা যায়নি', 'Could not add'))
    }
  }

  async function handleToggle(category: Category) {
    await updateCategory(category.id, { isActive: !category.isActive })
    await reload()
  }

  async function handleDelete(category: Category) {
    if (!window.confirm(t(`"${category.name}" মুছে ফেলবেন? পণ্যগুলো ক্যাটাগরিহীন হয়ে যাবে।`, `Delete "${category.name}"? Its products will become uncategorized.`))) return
    await deleteCategory(category.id)
    await reload()
  }

  return (
    <section>
      <h1>{t('ক্যাটাগরি ব্যবস্থাপনা', 'Category management')}</h1>

      <form className="inline-form" onSubmit={handleCreate}>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t('নতুন ক্যাটাগরির নাম', 'New category name')}
          maxLength={100}
        />
        <button type="submit">{t('যোগ করুন', 'Add')}</button>
      </form>
      {error && <div className="auth-error">{error}</div>}

      {loading ? (
        <p className="muted">{t('লোড হচ্ছে…', 'Loading…')}</p>
      ) : (
        <div className="table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>{t('নাম', 'Name')}</th>
                <th>{t('ক্রম', 'Order')}</th>
                <th>{t('সক্রিয়', 'Active')}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {categories.map((c) => (
                <tr key={c.id}>
                  <td>{c.name}</td>
                  <td>{c.sortOrder}</td>
                  <td>
                    <button
                      className={c.isActive ? 'toggle toggle--on' : 'toggle'}
                      onClick={() => handleToggle(c)}
                    >
                      {c.isActive ? t('হ্যাঁ', 'Yes') : t('না', 'No')}
                    </button>
                  </td>
                  <td className="admin-table__actions">
                    <button className="btn-danger" onClick={() => handleDelete(c)}>
                      {t('মুছুন', 'Delete')}
                    </button>
                  </td>
                </tr>
              ))}
              {categories.length === 0 && (
                <tr>
                  <td colSpan={4} className="muted">
                    {t('কোনো ক্যাটাগরি নেই।', 'No categories yet.')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

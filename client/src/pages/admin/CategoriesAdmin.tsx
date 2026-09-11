import { useEffect, useState, useCallback, type FormEvent } from 'react'
import {
  createCategory,
  deleteCategory,
  fetchAdminCategories,
  updateCategory,
} from '../../lib/products'
import type { Category } from '../../types/product'
import { ApiError } from '../../lib/apiClient'
import './Admin.css'

export function CategoriesAdmin() {
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
      setError('ক্যাটাগরি লোড করা যায়নি')
    } finally {
      setLoading(false)
    }
  }, [])

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
      setError(err instanceof ApiError ? err.message : 'যোগ করা যায়নি')
    }
  }

  async function handleToggle(category: Category) {
    await updateCategory(category.id, { isActive: !category.isActive })
    await reload()
  }

  async function handleDelete(category: Category) {
    if (!window.confirm(`"${category.name}" মুছে ফেলবেন? পণ্যগুলো ক্যাটাগরিহীন হয়ে যাবে।`)) return
    await deleteCategory(category.id)
    await reload()
  }

  return (
    <section>
      <h1>ক্যাটাগরি ব্যবস্থাপনা</h1>

      <form className="inline-form" onSubmit={handleCreate}>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="নতুন ক্যাটাগরির নাম"
          maxLength={100}
        />
        <button type="submit">যোগ করুন</button>
      </form>
      {error && <div className="auth-error">{error}</div>}

      {loading ? (
        <p className="muted">লোড হচ্ছে…</p>
      ) : (
        <div className="table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>নাম</th>
                <th>ক্রম</th>
                <th>সক্রিয়</th>
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
                      {c.isActive ? 'হ্যাঁ' : 'না'}
                    </button>
                  </td>
                  <td className="admin-table__actions">
                    <button className="btn-danger" onClick={() => handleDelete(c)}>
                      মুছুন
                    </button>
                  </td>
                </tr>
              ))}
              {categories.length === 0 && (
                <tr>
                  <td colSpan={4} className="muted">
                    কোনো ক্যাটাগরি নেই।
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

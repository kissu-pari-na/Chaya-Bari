import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import {
  createProduct,
  deleteProduct,
  fetchAdminCategories,
  fetchAdminProducts,
  updateProduct,
} from '../../lib/products'
import type { Category, Product, ProductInput } from '../../types/product'
import { formatBdt } from '../../lib/format'
import { ProductForm } from './ProductForm'
import './Admin.css'

type Mode = { kind: 'list' } | { kind: 'create' } | { kind: 'edit'; product: Product }

export function ProductsAdmin() {
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [mode, setMode] = useState<Mode>({ kind: 'list' })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    setLoading(true)
    try {
      const [p, c] = await Promise.all([fetchAdminProducts(), fetchAdminCategories()])
      setProducts(p)
      setCategories(c)
      setError(null)
    } catch {
      setError('তথ্য লোড করা যায়নি')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void reload()
  }, [reload])

  async function handleCreate(input: ProductInput) {
    await createProduct(input)
    setMode({ kind: 'list' })
    await reload()
  }

  async function handleUpdate(id: string, input: ProductInput) {
    await updateProduct(id, input)
    setMode({ kind: 'list' })
    await reload()
  }

  async function handleToggle(product: Product, field: 'isActive' | 'isAvailable') {
    await updateProduct(product.id, { [field]: !product[field] })
    await reload()
  }

  async function handleDelete(product: Product) {
    if (!window.confirm(`"${product.name}" মুছে ফেলবেন?`)) return
    await deleteProduct(product.id)
    await reload()
  }

  if (mode.kind === 'create') {
    return <ProductForm categories={categories} onSubmit={handleCreate} onCancel={() => setMode({ kind: 'list' })} />
  }
  if (mode.kind === 'edit') {
    return (
      <ProductForm
        categories={categories}
        initial={mode.product}
        onSubmit={(input) => handleUpdate(mode.product.id, input)}
        onCancel={() => setMode({ kind: 'list' })}
      />
    )
  }

  return (
    <section>
      <div className="admin-head">
        <h1>পণ্য ব্যবস্থাপনা</h1>
        <button onClick={() => setMode({ kind: 'create' })}>+ নতুন পণ্য</button>
      </div>

      {loading && <p className="muted">লোড হচ্ছে…</p>}
      {error && <p className="muted">{error}</p>}

      {!loading && !error && (
        <div className="table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>নাম</th>
                <th>ক্যাটাগরি</th>
                <th>মূল্য</th>
                <th>সক্রিয়</th>
                <th>উপলব্ধ</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id}>
                  <td>{p.name}</td>
                  <td>{p.categoryName ?? '—'}</td>
                  <td>{formatBdt(p.price)}</td>
                  <td>
                    <button
                      className={p.isActive ? 'toggle toggle--on' : 'toggle'}
                      onClick={() => handleToggle(p, 'isActive')}
                    >
                      {p.isActive ? 'হ্যাঁ' : 'না'}
                    </button>
                  </td>
                  <td>
                    <button
                      className={p.isAvailable ? 'toggle toggle--on' : 'toggle'}
                      onClick={() => handleToggle(p, 'isAvailable')}
                    >
                      {p.isAvailable ? 'হ্যাঁ' : 'না'}
                    </button>
                  </td>
                  <td className="admin-table__actions">
                    <button className="btn-ghost" onClick={() => setMode({ kind: 'edit', product: p })}>
                      সম্পাদনা
                    </button>
                    <Link className="btn-ghost" to={`/admin/products/${p.id}/recipe`}>
                      রেসিপি
                    </Link>
                    <button className="btn-danger" onClick={() => handleDelete(p)}>
                      মুছুন
                    </button>
                  </td>
                </tr>
              ))}
              {products.length === 0 && (
                <tr>
                  <td colSpan={6} className="muted">
                    কোনো পণ্য নেই। নতুন পণ্য যোগ করুন।
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

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
import { useI18n } from '../../context/LanguageContext'
import { ProductForm } from './ProductForm'
import './Admin.css'

type Mode = { kind: 'list' } | { kind: 'create' } | { kind: 'edit'; product: Product }

export function ProductsAdmin() {
  const { t, tc } = useI18n()
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
      setError(t('তথ্য লোড করা যায়নি', 'Could not load data'))
    } finally {
      setLoading(false)
    }
  }, [t])

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
    if (!window.confirm(t(`"${product.name}" মুছে ফেলবেন?`, `Delete "${product.name}"?`))) return
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
        <h1>{t('পণ্য ব্যবস্থাপনা', 'Product management')}</h1>
        <button onClick={() => setMode({ kind: 'create' })}>+ {t('নতুন পণ্য', 'New product')}</button>
      </div>

      {loading && <p className="muted">{t('লোড হচ্ছে…', 'Loading…')}</p>}
      {error && <p className="muted">{error}</p>}

      {!loading && !error && (
        <div className="table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>{t('নাম', 'Name')}</th>
                <th>{t('ক্যাটাগরি', 'Category')}</th>
                <th>{t('মূল্য', 'Price')}</th>
                <th>{t('সক্রিয়', 'Active')}</th>
                <th>{t('উপলব্ধ', 'Available')}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id}>
                  <td>{tc(p.name, p.nameEnglish)}</td>
                  <td>{p.categoryName ?? '—'}</td>
                  <td>{formatBdt(p.price)}</td>
                  <td>
                    <button
                      className={p.isActive ? 'toggle toggle--on' : 'toggle'}
                      onClick={() => handleToggle(p, 'isActive')}
                    >
                      {p.isActive ? t('হ্যাঁ', 'Yes') : t('না', 'No')}
                    </button>
                  </td>
                  <td>
                    <button
                      className={p.isAvailable ? 'toggle toggle--on' : 'toggle'}
                      onClick={() => handleToggle(p, 'isAvailable')}
                    >
                      {p.isAvailable ? t('হ্যাঁ', 'Yes') : t('না', 'No')}
                    </button>
                  </td>
                  <td className="admin-table__actions">
                    <button className="btn-ghost" onClick={() => setMode({ kind: 'edit', product: p })}>
                      {t('সম্পাদনা', 'Edit')}
                    </button>
                    <Link className="btn-ghost" to={`/admin/products/${p.id}/recipe`}>
                      {t('রেসিপি', 'Recipe')}
                    </Link>
                    <button className="btn-danger" onClick={() => handleDelete(p)}>
                      {t('মুছুন', 'Delete')}
                    </button>
                  </td>
                </tr>
              ))}
              {products.length === 0 && (
                <tr>
                  <td colSpan={6} className="muted">
                    {t('কোনো পণ্য নেই। নতুন পণ্য যোগ করুন।', 'No products yet. Add a new product.')}
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

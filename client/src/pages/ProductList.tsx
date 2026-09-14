import { useEffect, useState } from 'react'
import { fetchCategories, fetchProducts } from '../lib/products'
import { useI18n } from '../context/LanguageContext'
import { ProductCard } from '../components/ProductCard'
import type { Category, Product } from '../types/product'
import './Products.css'

export function ProductList() {
  const { t } = useI18n()
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [activeCategory, setActiveCategory] = useState<string | undefined>(undefined)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchCategories().then(setCategories).catch(() => setCategories([]))
  }, [])

  useEffect(() => {
    let active = true
    setLoading(true)
    fetchProducts(activeCategory)
      .then((p) => active && setProducts(p))
      .catch(() => active && setError('__LOAD_ERROR__'))
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [activeCategory])

  return (
    <section>
      <h1>{t('আমাদের পণ্য', 'Our Products')}</h1>

      <div className="category-filter">
        <button
          className={!activeCategory ? 'chip chip--active' : 'chip'}
          onClick={() => setActiveCategory(undefined)}
        >
          {t('সব', 'All')}
        </button>
        {categories.map((c) => (
          <button
            key={c.id}
            className={activeCategory === c.id ? 'chip chip--active' : 'chip'}
            onClick={() => setActiveCategory(c.id)}
          >
            {c.name}
          </button>
        ))}
      </div>

      {loading && <p className="muted">{t('লোড হচ্ছে…', 'Loading…')}</p>}
      {error && <p className="muted">{t('পণ্য লোড করা যায়নি', 'Could not load products')}</p>}
      {!loading && !error && products.length === 0 && <p className="muted">{t('কোনো পণ্য নেই।', 'No products available.')}</p>}

      <div className="product-grid">
        {products.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
    </section>
  )
}

import { useEffect, useState } from 'react'
import { fetchCategories, fetchProducts } from '../lib/products'
import { ProductCard } from '../components/ProductCard'
import type { Category, Product } from '../types/product'
import './Products.css'

export function ProductList() {
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
      .catch(() => active && setError('পণ্য লোড করা যায়নি'))
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [activeCategory])

  return (
    <section>
      <h1>আমাদের পণ্য</h1>

      <div className="category-filter">
        <button
          className={!activeCategory ? 'chip chip--active' : 'chip'}
          onClick={() => setActiveCategory(undefined)}
        >
          সব
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

      {loading && <p className="muted">লোড হচ্ছে…</p>}
      {error && <p className="muted">{error}</p>}
      {!loading && !error && products.length === 0 && <p className="muted">কোনো পণ্য নেই।</p>}

      <div className="product-grid">
        {products.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
    </section>
  )
}

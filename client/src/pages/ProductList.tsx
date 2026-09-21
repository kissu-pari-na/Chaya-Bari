import { useCallback, useEffect, useRef, useState } from 'react'
import { fetchCategories, fetchProductsPage } from '../lib/products'
import { useInfiniteScroll } from '../lib/useInfiniteScroll'
import { useI18n } from '../context/LanguageContext'
import { useContentLang } from '../context/TranslationContext'
import { ProductCard } from '../components/ProductCard'
import type { Category, Product } from '../types/product'
import './Products.css'

const PAGE_SIZE = 12

export function ProductList() {
  const { t } = useI18n()
  const { l } = useContentLang()
  const [products, setProducts] = useState<Product[]>([])
  const [total, setTotal] = useState(0)
  const [categories, setCategories] = useState<Category[]>([])
  const [activeCategory, setActiveCategory] = useState<string | undefined>(undefined)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const loadingMoreRef = useRef(false)

  useEffect(() => {
    fetchCategories().then(setCategories).catch(() => setCategories([]))
  }, [])

  // Load (or reload) the first page whenever the category filter changes.
  useEffect(() => {
    let active = true
    setLoading(true)
    setError(null)
    fetchProductsPage({ categoryId: activeCategory, offset: 0, limit: PAGE_SIZE })
      .then((r) => {
        if (!active) return
        setProducts(r.products)
        setTotal(r.total)
      })
      .catch(() => active && setError('__LOAD_ERROR__'))
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [activeCategory])

  const loadMore = useCallback(() => {
    if (loadingMoreRef.current) return
    loadingMoreRef.current = true
    setLoadingMore(true)
    fetchProductsPage({ categoryId: activeCategory, offset: products.length, limit: PAGE_SIZE })
      .then((r) => {
        setProducts((cur) => [...cur, ...r.products])
        setTotal(r.total)
      })
      .catch(() => {})
      .finally(() => {
        loadingMoreRef.current = false
        setLoadingMore(false)
      })
  }, [activeCategory, products.length])

  const hasMore = products.length < total
  const sentinel = useInfiniteScroll<HTMLDivElement>(loadMore, hasMore && !loading)

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
            {l(c.name)}
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

      {hasMore && <div ref={sentinel} className="infinite-sentinel" aria-hidden="true" />}
      {loadingMore && <p className="muted infinite-status">{t('আরও লোড হচ্ছে…', 'Loading more…')}</p>}
    </section>
  )
}

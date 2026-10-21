import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useI18n } from '../context/LanguageContext'
import { useContentLang } from '../context/TranslationContext'
import { toBnDigits } from '../lib/format'
import { ProductCard } from './ProductCard'
import type { Category, Product } from '../types/product'

/// The home page menu, grouped by category (vault D-SHOP-003). A chip bar picks
/// a category; "All" shows each category as its own section, most popular
/// first, capped so the page stays short, with a link to the full list.
export function MenuByCategory({ products, categories, perSection = 8 }: { products: Product[]; categories: Category[]; perSection?: number }) {
  const { t } = useI18n()
  const { l } = useContentLang()
  const [active, setActive] = useState<string>('all')

  const groups = useMemo(() => {
    const popular = (a: Product, b: Product) => b.avgRating - a.avgRating || b.reviewCount - a.reviewCount
    const order = new Map(categories.map((c, i) => [c.id, i]))
    const byCat = new Map<string, { id: string; name: string; items: Product[] }>()
    for (const p of products) {
      const id = p.categoryId ?? 'other'
      const g = byCat.get(id) ?? { id, name: p.categoryName ?? t('অন্যান্য', 'Other'), items: [] }
      g.items.push(p)
      byCat.set(id, g)
    }
    return [...byCat.values()]
      .map((g) => ({ ...g, items: g.items.sort((a, b) => Number(b.isAvailable) - Number(a.isAvailable) || popular(a, b)) }))
      .sort((a, b) => (order.get(a.id) ?? 999) - (order.get(b.id) ?? 999))
  }, [products, categories, t])

  if (!groups.length) return null
  const shown = active === 'all' ? groups : groups.filter((g) => g.id === active)

  return (
    <div className="menu-cats">
      <div className="category-filter menu-cats__chips" role="tablist" aria-label={t('ক্যাটাগরি', 'Categories')}>
        <button type="button" role="tab" aria-selected={active === 'all'} className={active === 'all' ? 'chip chip--active' : 'chip'} onClick={() => setActive('all')}>
          {t('সব', 'All')}
        </button>
        {groups.map((g) => (
          <button
            key={g.id}
            type="button"
            role="tab"
            aria-selected={active === g.id}
            className={active === g.id ? 'chip chip--active' : 'chip'}
            onClick={() => setActive(g.id)}
          >
            {l(g.name)} <span className="chip__count">{toBnDigits(g.items.length)}</span>
          </button>
        ))}
      </div>

      {shown.map((g) => {
        const items = active === 'all' ? g.items.slice(0, perSection) : g.items
        return (
          <section key={g.id} className="menu-cats__section" aria-label={l(g.name)}>
            {active === 'all' && (
              <div className="menu-cats__head">
                <h3>{l(g.name)}</h3>
                {g.items.length > items.length && g.id !== 'other' && (
                  <Link to={`/products?category=${g.id}`}>
                    {t(`সব ${toBnDigits(g.items.length)}টি দেখুন`, `See all ${g.items.length}`)} →
                  </Link>
                )}
              </div>
            )}
            <div className="product-grid">
              {items.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </section>
        )
      })}
    </div>
  )
}

import { useState, type MouseEvent } from 'react'
import { Link } from 'react-router-dom'
import { useCart } from '../context/CartContext'
import { useI18n } from '../context/LanguageContext'
import { useContentLang } from '../context/TranslationContext'
import { formatBdt, toBnDigits } from '../lib/format'
import type { Product } from '../types/product'
import './ProductCard.css'

/** A standard-size menu card (vault D-SHOP-003): square photo, name, rating,
 *  price and a one-tap add button, so many dishes fit on screen. The product
 *  page shows the dish large. */
export function ProductCard({ product: p }: { product: Product }) {
  const { addItem } = useCart()
  const { t } = useI18n()
  const { lc, l } = useContentLang()
  const [added, setAdded] = useState(false)
  const onSale = p.salePrice != null && p.salePrice < p.price
  const shown = onSale ? p.salePrice! : p.price
  const name = lc(p.name, p.nameEnglish)

  function add(e: MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    addItem(p)
    setAdded(true)
    window.setTimeout(() => setAdded(false), 1400)
  }

  return (
    <Link to={`/products/${p.id}`} className={p.isAvailable ? 'pcard' : 'pcard pcard--out'}>
      <div className="pcard__media">
        <span className="pcard__orb" aria-hidden="true" />
        {p.imageUrl ? <img src={p.imageUrl} alt="" loading="lazy" /> : <span className="pcard__glyph" aria-hidden="true">🍽️</span>}
        {onSale && <span className="pcard__flag pcard__flag--sale">{t('সেল', 'Sale')}</span>}
        {!p.isAvailable && <span className="pcard__flag pcard__flag--out">{t('শেষ', 'Sold out')}</span>}
      </div>
      <div className="pcard__body">
        <span className="pcard__name">{name}</span>
        <span className="pcard__meta">
          {p.reviewCount > 0 ? (
            <>
              <span className="pcard__star" aria-hidden="true">★</span> {toBnDigits(p.avgRating.toFixed(1))}{' '}
              <span className="muted">({toBnDigits(p.reviewCount)})</span>
            </>
          ) : (
            <span className="muted">{l(p.categoryName) || t('ঘরে তৈরি', 'Homemade')}</span>
          )}
        </span>
        <div className="pcard__foot">
          <span className="pcard__price num">
            {formatBdt(shown)}
            {onSale && <s className="pcard__was">{formatBdt(p.price)}</s>}
          </span>
          {p.isAvailable && (
            <button
              type="button"
              className={added ? 'pcard__add pcard__add--done' : 'pcard__add'}
              onClick={add}
              aria-label={t(`${name} কার্টে যোগ করুন`, `Add ${name} to cart`)}
            >
              {added ? '✓' : '+'}
            </button>
          )}
        </div>
      </div>
    </Link>
  )
}

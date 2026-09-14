import { Link } from 'react-router-dom'
import { useCart } from '../context/CartContext'
import { RatingStars } from './RatingStars'
import { formatBdt } from '../lib/format'
import type { Product } from '../types/product'
import './ProductCard.css'

/** Split a product name into its first word and the remainder, so the card can
 *  render a two-tone heading (cream + gold) like the reference design. */
function splitName(name: string): [string, string] {
  const trimmed = name.trim()
  const i = trimmed.indexOf(' ')
  if (i === -1) return [trimmed, '']
  return [trimmed.slice(0, i), trimmed.slice(i + 1)]
}

export function ProductCard({ product: p }: { product: Product }) {
  const { addItem } = useCart()
  const onSale = p.salePrice != null && p.salePrice < p.price
  const shown = onSale ? p.salePrice! : p.price
  const [first, rest] = splitName(p.name)
  const sub = p.description?.trim() || p.categoryName || 'ঘরে তৈরি, তাজা পরিবেশিত'

  return (
    <Link to={`/products/${p.id}`} className="pcard">
      <span className="pcard__diag" aria-hidden="true" />
      <span className="pcard__watermark" aria-hidden="true">{first}</span>

      {onSale && <span className="pcard__flag pcard__flag--sale">সেল</span>}
      {!p.isAvailable && <span className="pcard__flag pcard__flag--out">সোল্ড আউট</span>}

      <div className="pcard__price">
        {formatBdt(shown)}
        {onSale && <span className="pcard__was">{formatBdt(p.price)}</span>}
      </div>

      <div className="pcard__media">
        {p.imageUrl ? (
          <img src={p.imageUrl} alt={p.name} />
        ) : (
          <span className="pcard__glyph">🍽️</span>
        )}
      </div>

      <div className="pcard__body">
        {p.categoryName && <span className="pcard__cat">{p.categoryName}</span>}
        <h3 className="pcard__name">
          {first}
          {rest && <span className="pcard__name-2"> {rest}</span>}
        </h3>
        <p className="pcard__sub">{sub}</p>
        {p.reviewCount > 0 && (
          <div className="pcard__rating">
            <RatingStars rating={p.avgRating} count={p.reviewCount} size="sm" />
          </div>
        )}

        <div className="pcard__foot">
          {p.isAvailable ? (
            <button
              className="pcard__add"
              onClick={(e) => {
                e.preventDefault()
                addItem(p)
              }}
            >
              কার্টে যোগ করুন <span aria-hidden="true">→</span>
            </button>
          ) : (
            <span className="pcard__add pcard__add--disabled">স্টকে নেই</span>
          )}
        </div>
      </div>

      <span className="pcard__dot" aria-hidden="true" />
    </Link>
  )
}

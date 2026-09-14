import { Link } from 'react-router-dom'
import { useCart } from '../context/CartContext'
import { RatingStars } from './RatingStars'
import { formatBdt } from '../lib/format'
import type { Product } from '../types/product'
import './ProductCard.css'

/** Split a product name into its first word and the remainder, so the card can
 *  render the reference's stacked title (a large outlined word + a solid line). */
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
  const solid = rest || p.categoryName || ''
  const desc = p.description?.trim() || p.categoryName || 'ঘরে তৈরি, তাজা পরিবেশিত'

  return (
    <Link to={`/products/${p.id}`} className="pcard">
      {/* geometric background shape (juts out top-right) */}
      <span className="pcard__shape" aria-hidden="true" />

      {/* card body + diagonal accent wedge */}
      <span className="pcard__surface" aria-hidden="true">
        <span className="pcard__wedge" />
      </span>

      {/* flags */}
      {onSale && <span className="pcard__flag pcard__flag--sale">সেল</span>}
      {!p.isAvailable && <span className="pcard__flag pcard__flag--out">সোল্ড আউট</span>}

      {/* price over the shape */}
      <div className="pcard__price">
        {formatBdt(shown)}
        {onSale && <span className="pcard__was">{formatBdt(p.price)}</span>}
      </div>

      {/* product image, bursting up over the shape */}
      <div className="pcard__media">
        {p.imageUrl ? (
          <img src={p.imageUrl} alt={p.name} />
        ) : (
          <span className="pcard__glyph">🍽️</span>
        )}
      </div>

      {/* upper visual zone reserves space for the product */}
      <div className="pcard__visual" aria-hidden="true" />

      {/* lower-left content */}
      <div className="pcard__content">
        <div className="pcard__title">
          <span className="pcard__title-outline">{first}</span>
          {solid && <span className="pcard__title-solid">{solid}</span>}
        </div>
        <p className="pcard__desc">{desc}</p>
        {p.reviewCount > 0 && (
          <div className="pcard__rating">
            <RatingStars rating={p.avgRating} count={p.reviewCount} size="sm" />
          </div>
        )}

        <div className="pcard__cta-row">
          {p.isAvailable ? (
            <button
              className="pcard__cta"
              onClick={(e) => {
                e.preventDefault()
                addItem(p)
              }}
            >
              কার্টে যোগ করুন <span aria-hidden="true">→</span>
            </button>
          ) : (
            <span className="pcard__cta pcard__cta--disabled">স্টকে নেই</span>
          )}
        </div>
      </div>

      {/* decorative circle straddling the bottom-left corner */}
      <span className="pcard__dot" aria-hidden="true" />
    </Link>
  )
}

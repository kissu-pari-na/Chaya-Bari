import { toBnDigits } from '../lib/format'
import './RatingStars.css'

interface RatingStarsProps {
  rating: number
  /// Number of reviews; when provided it is shown next to the stars.
  count?: number
  /// Compact variant for product cards.
  size?: 'sm' | 'md'
}

/// Read-only star rating. Renders five stars with the rounded rating filled,
/// plus an optional review count in Bengali numerals.
export function RatingStars({ rating, count, size = 'md' }: RatingStarsProps) {
  const filled = Math.round(rating)
  return (
    <span className={`stars stars--${size}`} aria-label={`${rating} of 5`}>
      <span className="stars__mark" aria-hidden="true">
        {'★'.repeat(filled)}
        <span className="stars__empty">{'★'.repeat(5 - filled)}</span>
      </span>
      {rating > 0 && <span className="stars__value">{toBnDigits(rating.toFixed(1))}</span>}
      {count != null && count > 0 && (
        <span className="stars__count">({toBnDigits(count)})</span>
      )}
    </span>
  )
}

import { useEffect, useState } from 'react'
import { fetchProductReviews } from '../lib/reviews'
import { toBnDigits } from '../lib/format'
import { useI18n } from '../context/LanguageContext'
import { RatingStars } from './RatingStars'
import type { RatingSummary, Review } from '../types/review'
import './ProductReviews.css'

interface ProductReviewsProps {
  productId: string
}

/// Read-only reviews block for the product detail page. Reviews can only be
/// *submitted* from an order's review page, so there is no form here.
export function ProductReviews({ productId }: ProductReviewsProps) {
  const { t } = useI18n()
  const [reviews, setReviews] = useState<Review[]>([])
  const [summary, setSummary] = useState<RatingSummary>({ average: 0, count: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    setLoading(true)
    fetchProductReviews(productId)
      .then((r) => {
        if (!active) return
        setReviews(r.reviews)
        setSummary(r.summary)
      })
      .catch(() => undefined)
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [productId])

  return (
    <section className="reviews-block">
      <div className="reviews-block__head">
        <h2>{t('রিভিউ ও রেটিং', 'Reviews & Ratings')}</h2>
        {summary.count > 0 ? (
          <div className="reviews-block__summary">
            <RatingStars rating={summary.average} />
            <span className="reviews-block__count">
              {t(`${toBnDigits(summary.count)} জন ক্রেতার মতামত`, `${toBnDigits(summary.count)} customer reviews`)}
            </span>
          </div>
        ) : (
          <span className="reviews-block__count">{t('এখনও কোনো রিভিউ নেই', 'No reviews yet')}</span>
        )}
      </div>

      <p className="reviews-block__hint">
        {t(
          'রিভিউ দিতে চান? ডেলিভারি সম্পন্ন হলে আমার অর্ডার থেকে সেই অর্ডারের রিভিউ পাতায় গিয়ে রিভিউ দিন।',
          'Want to leave a review? Once your order is delivered, go to its review page from My Orders.',
        )}
      </p>

      {loading ? (
        <p className="muted">{t('লোড হচ্ছে…', 'Loading…')}</p>
      ) : reviews.length === 0 ? null : (
        <ul className="review-list">
          {reviews.map((r) => (
            <li key={r.id} className="review-item">
              <div className="review-item__top">
                <span className="review-item__avatar" aria-hidden="true">
                  {r.customerName.charAt(0)}
                </span>
                <div>
                  <div className="review-item__name">{r.customerName}</div>
                  <RatingStars rating={r.rating} size="sm" />
                </div>
              </div>
              {r.comment && <p className="review-item__text">“{r.comment}”</p>}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

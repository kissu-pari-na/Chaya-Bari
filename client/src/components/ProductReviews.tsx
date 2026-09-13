import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { fetchMyReview, fetchProductReviews, submitReview } from '../lib/reviews'
import { toBnDigits } from '../lib/format'
import { RatingStars } from './RatingStars'
import type { RatingSummary, Review } from '../types/review'
import './ProductReviews.css'

interface ProductReviewsProps {
  productId: string
  /// Called after a successful submit so the parent can refresh the product's
  /// header rating.
  onRatingChanged?: () => void
}

/// Full reviews block for the product detail page: summary, review list, and —
/// for an eligible signed-in customer — a submit/edit form.
export function ProductReviews({ productId, onRatingChanged }: ProductReviewsProps) {
  const { user } = useAuth()
  const [reviews, setReviews] = useState<Review[]>([])
  const [summary, setSummary] = useState<RatingSummary>({ average: 0, count: 0 })
  const [canReview, setCanReview] = useState(false)
  const [myReview, setMyReview] = useState<Review | null>(null)
  const [loading, setLoading] = useState(true)

  // Form state.
  const [rating, setRating] = useState(0)
  const [hover, setHover] = useState(0)
  const [comment, setComment] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  const isCustomer = user?.role === 'CUSTOMER'

  useEffect(() => {
    let active = true
    setLoading(true)
    const publicP = fetchProductReviews(productId)
    const mineP = isCustomer ? fetchMyReview(productId) : Promise.resolve(null)
    Promise.all([publicP, mineP])
      .then(([pub, mine]) => {
        if (!active) return
        setReviews(pub.reviews)
        setSummary(pub.summary)
        if (mine) {
          setCanReview(mine.canReview)
          setMyReview(mine.review)
          if (mine.review) {
            setRating(mine.review.rating)
            setComment(mine.review.comment ?? '')
          }
        }
      })
      .catch(() => active && setError('রিভিউ লোড করা যায়নি'))
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [productId, isCustomer])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (rating < 1) {
      setError('অনুগ্রহ করে একটি রেটিং নির্বাচন করুন')
      return
    }
    setSaving(true)
    setError(null)
    try {
      await submitReview(productId, { rating, comment: comment.trim() || undefined })
      const pub = await fetchProductReviews(productId)
      setReviews(pub.reviews)
      setSummary(pub.summary)
      const mine = await fetchMyReview(productId)
      setMyReview(mine.review)
      setDone(true)
      onRatingChanged?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'রিভিউ জমা দেওয়া যায়নি')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="reviews-block">
      <div className="reviews-block__head">
        <h2>রিভিউ ও রেটিং</h2>
        {summary.count > 0 ? (
          <div className="reviews-block__summary">
            <RatingStars rating={summary.average} />
            <span className="reviews-block__count">
              {toBnDigits(summary.count)} জন ক্রেতার মতামত
            </span>
          </div>
        ) : (
          <span className="reviews-block__count">এখনও কোনো রিভিউ নেই</span>
        )}
      </div>

      {/* Submit / edit form for an eligible customer. */}
      {isCustomer && canReview && (
        <form className="review-form" onSubmit={handleSubmit}>
          <h3>{myReview ? 'আপনার রিভিউ সম্পাদনা করুন' : 'আপনার মতামত দিন'}</h3>
          <div className="review-form__stars" role="radiogroup" aria-label="রেটিং">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                type="button"
                key={n}
                className={`review-form__star ${(hover || rating) >= n ? 'is-on' : ''}`}
                onMouseEnter={() => setHover(n)}
                onMouseLeave={() => setHover(0)}
                onClick={() => setRating(n)}
                aria-label={`${n} star`}
                aria-checked={rating === n}
                role="radio"
              >
                ★
              </button>
            ))}
          </div>
          <textarea
            className="review-form__text"
            rows={3}
            maxLength={1000}
            placeholder="খাবার কেমন লেগেছে লিখুন (ঐচ্ছিক)…"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
          {error && <p className="review-form__err">{error}</p>}
          {done && <p className="review-form__ok">✓ ধন্যবাদ! আপনার রিভিউ যুক্ত হয়েছে।</p>}
          <button className="review-form__submit" type="submit" disabled={saving}>
            {saving ? 'জমা হচ্ছে…' : myReview ? 'আপডেট করুন' : 'রিভিউ জমা দিন'}
          </button>
        </form>
      )}

      {/* Eligibility hints. */}
      {isCustomer && !canReview && !loading && (
        <p className="reviews-block__hint">
          শুধু এই পণ্য অর্ডার করা ক্রেতারাই রিভিউ দিতে পারেন।
        </p>
      )}
      {!user && !loading && (
        <p className="reviews-block__hint">
          রিভিউ দিতে <Link to="/login">লগইন</Link> করুন।
        </p>
      )}

      {/* Review list. */}
      {loading ? (
        <p className="muted">লোড হচ্ছে…</p>
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

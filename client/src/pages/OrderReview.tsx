import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { fetchOrderReview, submitOrderReviews } from '../lib/reviews'
import { StarPicker } from '../components/StarPicker'
import { RatingStars } from '../components/RatingStars'
import { useI18n } from '../context/LanguageContext'
import type { OrderReviewData, OrderReviewSubmit } from '../types/review'
import './OrderReview.css'

interface Draft {
  rating: number
  comment: string
}

// Reviews start at a full 5 stars; the customer lowers them only if they wish.
const DEFAULT_RATING = 5

export function OrderReview() {
  const { t } = useI18n()
  const { id } = useParams<{ id: string }>()
  const [data, setData] = useState<OrderReviewData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [drafts, setDrafts] = useState<Record<string, Draft>>({})
  const [overall, setOverall] = useState<Draft>({ rating: DEFAULT_RATING, comment: '' })
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)
  const [submitErr, setSubmitErr] = useState<string | null>(null)

  function hydrate(d: OrderReviewData) {
    setData(d)
    const next: Record<string, Draft> = {}
    for (const p of d.products) {
      next[p.productId] = {
        rating: p.rating ?? DEFAULT_RATING,
        comment: p.comment ?? '',
      }
    }
    setDrafts(next)
    setOverall({ rating: d.overall?.rating ?? DEFAULT_RATING, comment: d.overall?.comment ?? '' })
  }

  useEffect(() => {
    if (!id) return
    let active = true
    setLoading(true)
    fetchOrderReview(id)
      .then((d) => active && hydrate(d))
      .catch(() => active && setError('__NOT_FOUND__'))
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [id])

  function setDraft(productId: string, patch: Partial<Draft>) {
    setDrafts((d) => ({ ...d, [productId]: { ...d[productId], ...patch } }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!id || !data) return
    // Only products that have not already been reviewed can be submitted.
    const items = data.products
      .filter((p) => p.rating == null)
      .map((p) => ({
        productId: p.productId,
        rating: drafts[p.productId]?.rating ?? DEFAULT_RATING,
        comment: drafts[p.productId]?.comment.trim() || undefined,
      }))
    const body: OrderReviewSubmit = { items }
    if (data.overall == null) {
      body.overall = { rating: overall.rating, comment: overall.comment.trim() || undefined }
    }
    if ((body.items?.length ?? 0) === 0 && !body.overall) {
      setSubmitErr(t('জমা দেওয়ার মতো কিছু নেই', 'Nothing to submit'))
      return
    }
    setSaving(true)
    setSubmitErr(null)
    try {
      const updated = await submitOrderReviews(id, body)
      hydrate(updated)
      setDone(true)
    } catch (err) {
      setSubmitErr(err instanceof Error ? err.message : t('রিভিউ জমা দেওয়া যায়নি', 'Could not submit the review'))
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <p className="muted">{t('লোড হচ্ছে…', 'Loading…')}</p>
  if (error || !data)
    return (
      <div className="card">
        <p className="muted">{t('অর্ডারটি পাওয়া যায়নি', 'Order not found')}</p>
        <Link to="/orders">← {t('আমার অর্ডার', 'My Orders')}</Link>
      </div>
    )

  const allReviewed = data.products.every((p) => p.rating != null) && data.overall != null

  return (
    <section className="card order-review">
      <Link to={`/orders/${data.orderId}`} className="order-review__back">
        ← {t('অর্ডার', 'Order')} {data.orderNumber}
      </Link>
      <h1>{t('রিভিউ দিন', 'Leave a Review')}</h1>
      <p className="muted">{t(`অর্ডার ${data.orderNumber} এর পণ্যগুলোর রিভিউ ও রেটিং দিন। একবার জমা দিলে রিভিউ পরিবর্তন করা যাবে না।`, `Rate and review the products in order ${data.orderNumber}. Reviews cannot be changed once submitted.`)}</p>

      {!data.canReview ? (
        <p className="order-review__gate">
          {t('এই অর্ডারটি এখনও ডেলিভার হয়নি। ডেলিভারি সম্পন্ন হলে আপনি রিভিউ দিতে পারবেন।', 'This order has not been delivered yet. You can review it once delivery is complete.')}
        </p>
      ) : allReviewed ? (
        <p className="order-review__done">✓ {t('এই অর্ডারের রিভিউ দেওয়া হয়ে গেছে। ধন্যবাদ!', 'This order has already been reviewed. Thank you!')}</p>
      ) : (
        <form onSubmit={handleSubmit}>
          <div className="rev-list">
            {data.products.map((p) => {
              const locked = p.rating != null
              return (
                <div key={p.productId} className={`rev-row ${locked ? 'rev-row--locked' : ''}`}>
                  <div className="rev-row__head">
                    <span className="rev-row__name">{p.productName}</span>
                    <span className="rev-row__qty">× {p.quantity}</span>
                  </div>
                  {locked ? (
                    <>
                      <div className="rev-row__locked-stars">
                        <RatingStars rating={p.rating!} />
                        <span className="rev-row__done-tag">✓ {t('রিভিউ দেওয়া হয়েছে', 'Reviewed')}</span>
                      </div>
                      {p.comment && <p className="rev-row__locked-comment">“{p.comment}”</p>}
                    </>
                  ) : (
                    <>
                      <StarPicker
                        value={drafts[p.productId]?.rating ?? DEFAULT_RATING}
                        onChange={(r) => setDraft(p.productId, { rating: r })}
                        ariaLabel={t(`${p.productName} রেটিং`, `${p.productName} rating`)}
                      />
                      <textarea
                        className="rev-row__text"
                        rows={2}
                        maxLength={1000}
                        placeholder={t('এই পণ্য সম্পর্কে আপনার মতামত (ঐচ্ছিক)…', 'Your thoughts on this product (optional)…')}
                        value={drafts[p.productId]?.comment ?? ''}
                        onChange={(e) => setDraft(p.productId, { comment: e.target.value })}
                      />
                    </>
                  )}
                </div>
              )
            })}
          </div>

          <div className="rev-overall">
            <h2>{t('সামগ্রিক অভিজ্ঞতা', 'Overall experience')}</h2>
            {data.overall != null ? (
              <div className="rev-row rev-row--locked">
                <div className="rev-row__locked-stars">
                  <RatingStars rating={data.overall.rating} />
                  <span className="rev-row__done-tag">✓ {t('রিভিউ দেওয়া হয়েছে', 'Reviewed')}</span>
                </div>
                {data.overall.comment && (
                  <p className="rev-row__locked-comment">“{data.overall.comment}”</p>
                )}
              </div>
            ) : (
              <>
                <p className="muted">{t('পুরো অর্ডার নিয়ে আপনার সামগ্রিক রেটিং ও মতামত।', 'Your overall rating and thoughts on the whole order.')}</p>
                <StarPicker
                  value={overall.rating}
                  onChange={(r) => setOverall((o) => ({ ...o, rating: r }))}
                  ariaLabel={t('সামগ্রিক রেটিং', 'Overall rating')}
                />
                <textarea
                  className="rev-row__text"
                  rows={2}
                  maxLength={1000}
                  placeholder={t('সামগ্রিক অভিজ্ঞতা লিখুন (ঐচ্ছিক)…', 'Describe your overall experience (optional)…')}
                  value={overall.comment}
                  onChange={(e) => setOverall((o) => ({ ...o, comment: e.target.value }))}
                />
              </>
            )}
          </div>

          {submitErr && <p className="rev-err">{submitErr}</p>}
          {done && <p className="rev-ok">✓ {t('ধন্যবাদ! আপনার রিভিউ সংরক্ষণ করা হয়েছে।', 'Thank you! Your review has been saved.')}</p>}

          <button className="rev-submit" type="submit" disabled={saving}>
            {saving ? t('জমা হচ্ছে…', 'Submitting…') : t('রিভিউ জমা দিন', 'Submit review')}
          </button>
        </form>
      )}
    </section>
  )
}

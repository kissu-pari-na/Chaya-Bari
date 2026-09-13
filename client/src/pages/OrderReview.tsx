import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { fetchOrderReview, submitOrderReviews } from '../lib/reviews'
import { StarPicker } from '../components/StarPicker'
import { RatingStars } from '../components/RatingStars'
import type { OrderReviewData } from '../types/review'
import './OrderReview.css'

interface Draft {
  rating: number
  comment: string
}

// Reviews start at a full 5 stars; the customer lowers them only if they wish.
const DEFAULT_RATING = 5
const OVERALL_KEY = '__overall__'

export function OrderReview() {
  const { id } = useParams<{ id: string }>()
  const [data, setData] = useState<OrderReviewData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [drafts, setDrafts] = useState<Record<string, Draft>>({})
  const [overall, setOverall] = useState<Draft>({ rating: DEFAULT_RATING, comment: '' })
  // Which target (productId or OVERALL_KEY) is currently submitting.
  const [pending, setPending] = useState<string | null>(null)
  // Per-target feedback message.
  const [msg, setMsg] = useState<Record<string, { ok: boolean; text: string }>>({})

  function hydrate(d: OrderReviewData) {
    setData(d)
    const next: Record<string, Draft> = {}
    for (const p of d.products) {
      next[p.productId] = { rating: p.rating ?? DEFAULT_RATING, comment: p.comment ?? '' }
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
      .catch(() => active && setError('অর্ডারটি পাওয়া যায়নি'))
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [id])

  function setDraft(productId: string, patch: Partial<Draft>) {
    setDrafts((d) => ({ ...d, [productId]: { ...d[productId], ...patch } }))
  }

  // Submit a single product review (key = productId) or the overall review
  // (key = OVERALL_KEY). Only the submitted target is locked; other in-progress
  // rows keep their drafts.
  async function submitOne(key: string) {
    if (!id) return
    const body =
      key === OVERALL_KEY
        ? { overall: { rating: overall.rating, comment: overall.comment.trim() || undefined } }
        : { items: [{ productId: key, rating: drafts[key].rating, comment: drafts[key].comment.trim() || undefined }] }
    setPending(key)
    setMsg((m) => ({ ...m, [key]: { ok: false, text: '' } }))
    try {
      const updated = await submitOrderReviews(id, body)
      setData(updated) // lock the just-submitted target; leave other drafts intact
      setMsg((m) => ({ ...m, [key]: { ok: true, text: '✓ ধন্যবাদ! রিভিউ সংরক্ষণ করা হয়েছে।' } }))
    } catch (err) {
      setMsg((m) => ({
        ...m,
        [key]: { ok: false, text: err instanceof Error ? err.message : 'রিভিউ জমা দেওয়া যায়নি' },
      }))
    } finally {
      setPending(null)
    }
  }

  if (loading) return <p className="muted">লোড হচ্ছে…</p>
  if (error || !data)
    return (
      <div className="card">
        <p className="muted">{error ?? 'অর্ডারটি পাওয়া যায়নি'}</p>
        <Link to="/orders">← আমার অর্ডার</Link>
      </div>
    )

  const allReviewed = data.products.every((p) => p.rating != null) && data.overall != null

  return (
    <section className="card order-review">
      <Link to={`/orders/${data.orderId}`} className="order-review__back">
        ← অর্ডার {data.orderNumber}
      </Link>
      <h1>রিভিউ দিন</h1>
      <p className="muted">
        অর্ডার {data.orderNumber} এর প্রতিটি পণ্যের রিভিউ ও রেটিং আলাদাভাবে জমা দিন। একবার জমা দিলে রিভিউ
        পরিবর্তন করা যাবে না।
      </p>

      {!data.canReview ? (
        <p className="order-review__gate">
          এই অর্ডারটি এখনও ডেলিভার হয়নি। ডেলিভারি সম্পন্ন হলে আপনি রিভিউ দিতে পারবেন।
        </p>
      ) : (
        <>
          {allReviewed && (
            <p className="order-review__done">✓ এই অর্ডারের সব রিভিউ দেওয়া হয়ে গেছে। ধন্যবাদ!</p>
          )}

          <div className="rev-list">
            {data.products.map((p) => {
              const locked = p.rating != null
              const m = msg[p.productId]
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
                        <span className="rev-row__done-tag">✓ রিভিউ দেওয়া হয়েছে</span>
                      </div>
                      {p.comment && <p className="rev-row__locked-comment">“{p.comment}”</p>}
                    </>
                  ) : (
                    <>
                      <StarPicker
                        value={drafts[p.productId]?.rating ?? DEFAULT_RATING}
                        onChange={(r) => setDraft(p.productId, { rating: r })}
                        ariaLabel={`${p.productName} রেটিং`}
                      />
                      <textarea
                        className="rev-row__text"
                        rows={2}
                        maxLength={1000}
                        placeholder="এই পণ্য সম্পর্কে আপনার মতামত (ঐচ্ছিক)…"
                        value={drafts[p.productId]?.comment ?? ''}
                        onChange={(e) => setDraft(p.productId, { comment: e.target.value })}
                      />
                      {m && <p className={m.ok ? 'rev-ok' : 'rev-err'}>{m.text}</p>}
                      <button
                        type="button"
                        className="rev-submit rev-submit--row"
                        onClick={() => submitOne(p.productId)}
                        disabled={pending === p.productId}
                      >
                        {pending === p.productId ? 'জমা হচ্ছে…' : 'এই পণ্যের রিভিউ জমা দিন'}
                      </button>
                    </>
                  )}
                </div>
              )
            })}
          </div>

          <div className="rev-overall">
            <h2>সামগ্রিক অভিজ্ঞতা</h2>
            {data.overall != null ? (
              <div className="rev-row rev-row--locked">
                <div className="rev-row__locked-stars">
                  <RatingStars rating={data.overall.rating} />
                  <span className="rev-row__done-tag">✓ রিভিউ দেওয়া হয়েছে</span>
                </div>
                {data.overall.comment && (
                  <p className="rev-row__locked-comment">“{data.overall.comment}”</p>
                )}
              </div>
            ) : (
              <>
                <p className="muted">পুরো অর্ডার নিয়ে আপনার সামগ্রিক রেটিং ও মতামত।</p>
                <StarPicker
                  value={overall.rating}
                  onChange={(r) => setOverall((o) => ({ ...o, rating: r }))}
                  ariaLabel="সামগ্রিক রেটিং"
                />
                <textarea
                  className="rev-row__text"
                  rows={2}
                  maxLength={1000}
                  placeholder="সামগ্রিক অভিজ্ঞতা লিখুন (ঐচ্ছিক)…"
                  value={overall.comment}
                  onChange={(e) => setOverall((o) => ({ ...o, comment: e.target.value }))}
                />
                {msg[OVERALL_KEY] && (
                  <p className={msg[OVERALL_KEY].ok ? 'rev-ok' : 'rev-err'}>{msg[OVERALL_KEY].text}</p>
                )}
                <button
                  type="button"
                  className="rev-submit rev-submit--row"
                  onClick={() => submitOne(OVERALL_KEY)}
                  disabled={pending === OVERALL_KEY}
                >
                  {pending === OVERALL_KEY ? 'জমা হচ্ছে…' : 'সামগ্রিক রিভিউ জমা দিন'}
                </button>
              </>
            )}
          </div>
        </>
      )}
    </section>
  )
}

import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { fetchOrderReview, submitOrderReviews } from '../lib/reviews'
import { StarPicker } from '../components/StarPicker'
import type { OrderReviewData, OrderReviewSubmit } from '../types/review'
import './OrderReview.css'

interface Draft {
  rating: number
  comment: string
}

export function OrderReview() {
  const { id } = useParams<{ id: string }>()
  const [data, setData] = useState<OrderReviewData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [drafts, setDrafts] = useState<Record<string, Draft>>({})
  const [overall, setOverall] = useState<Draft>({ rating: 0, comment: '' })
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)
  const [submitErr, setSubmitErr] = useState<string | null>(null)

  function hydrate(d: OrderReviewData) {
    setData(d)
    const next: Record<string, Draft> = {}
    for (const p of d.products) {
      next[p.productId] = { rating: p.rating ?? 0, comment: p.comment ?? '' }
    }
    setDrafts(next)
    setOverall({ rating: d.overall?.rating ?? 0, comment: d.overall?.comment ?? '' })
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!id || !data) return
    const items = data.products
      .filter((p) => (drafts[p.productId]?.rating ?? 0) >= 1)
      .map((p) => ({
        productId: p.productId,
        rating: drafts[p.productId].rating,
        comment: drafts[p.productId].comment.trim() || undefined,
      }))
    const body: OrderReviewSubmit = { items }
    if (overall.rating >= 1) {
      body.overall = { rating: overall.rating, comment: overall.comment.trim() || undefined }
    }
    if ((body.items?.length ?? 0) === 0 && !body.overall) {
      setSubmitErr('অন্তত একটি পণ্যের অথবা সামগ্রিক রেটিং দিন')
      return
    }
    setSaving(true)
    setSubmitErr(null)
    try {
      const updated = await submitOrderReviews(id, body)
      hydrate(updated)
      setDone(true)
    } catch (err) {
      setSubmitErr(err instanceof Error ? err.message : 'রিভিউ জমা দেওয়া যায়নি')
    } finally {
      setSaving(false)
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

  return (
    <section className="card order-review">
      <Link to={`/orders/${data.orderId}`} className="order-review__back">
        ← অর্ডার {data.orderNumber}
      </Link>
      <h1>রিভিউ দিন</h1>
      <p className="muted">অর্ডার {data.orderNumber} এর পণ্যগুলোর রিভিউ ও রেটিং দিন।</p>

      {!data.canReview ? (
        <p className="order-review__gate">
          এই অর্ডারটি এখনও ডেলিভার হয়নি। ডেলিভারি সম্পন্ন হলে আপনি রিভিউ দিতে পারবেন।
        </p>
      ) : (
        <form onSubmit={handleSubmit}>
          <div className="rev-list">
            {data.products.map((p) => (
              <div key={p.productId} className="rev-row">
                <div className="rev-row__head">
                  <span className="rev-row__name">{p.productName}</span>
                  <span className="rev-row__qty">× {p.quantity}</span>
                </div>
                <StarPicker
                  value={drafts[p.productId]?.rating ?? 0}
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
              </div>
            ))}
          </div>

          <div className="rev-overall">
            <h2>সামগ্রিক অভিজ্ঞতা</h2>
            <p className="muted">পুরো অর্ডার নিয়ে আপনার সামগ্রিক রেটিং ও মতামত (ঐচ্ছিক)।</p>
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
          </div>

          {submitErr && <p className="rev-err">{submitErr}</p>}
          {done && <p className="rev-ok">✓ ধন্যবাদ! আপনার রিভিউ সংরক্ষণ করা হয়েছে।</p>}

          <button className="rev-submit" type="submit" disabled={saving}>
            {saving ? 'জমা হচ্ছে…' : 'রিভিউ জমা দিন'}
          </button>
        </form>
      )}
    </section>
  )
}

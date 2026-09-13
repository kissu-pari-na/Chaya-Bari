import { useCallback, useEffect, useMemo, useState } from 'react'
import { useBusinessProfile } from '../context/BusinessProfileContext'
import { fetchProduction, fetchProductionDates, setOrderStage } from '../lib/kitchen'
import type { CookLine, KitchenOrder, KitchenStage, ProductionDate } from '../types/kitchen'
import './Kitchen.css'

const bn = (n: number) => n.toLocaleString('bn-BD')

const COLUMNS: { stage: KitchenStage; title: string; hint: string }[] = [
  { stage: 'CONFIRMED', title: 'রান্নার জন্য', hint: 'নতুন অর্ডার — রান্না শুরু করুন' },
  { stage: 'PREPARING', title: 'তৈরি হচ্ছে', hint: 'রান্না চলছে' },
  { stage: 'PACKED', title: 'প্রস্তুত', hint: 'প্যাক ও ডেলিভারির জন্য তৈরি' },
]

interface Board {
  cook: CookLine[]
  totals: { orders: number; toCook: number; preparing: number; packed: number; items: number }
  columns: Record<KitchenStage, KitchenOrder[]>
}

/// Derives the board (per-item cook summary + orders grouped by stage) from the
/// order list, so an optimistic status change updates everything instantly.
function deriveBoard(orders: KitchenOrder[]): Board {
  const cookByKey = new Map<string, CookLine>()
  const columns: Record<KitchenStage, KitchenOrder[]> = { CONFIRMED: [], PREPARING: [], PACKED: [] }

  for (const o of orders) {
    columns[o.status].push(o)
    const done = o.status === 'PACKED'
    for (const it of o.items) {
      const key = it.productName
      const line = cookByKey.get(key) ?? { productId: null, productName: it.productName, total: 0, packed: 0, remaining: 0 }
      line.total += it.quantity
      if (done) line.packed += it.quantity
      cookByKey.set(key, line)
    }
  }
  const cook = [...cookByKey.values()]
    .map((l) => ({ ...l, remaining: l.total - l.packed }))
    .sort((a, b) => b.remaining - a.remaining || b.total - a.total)

  return {
    cook,
    totals: {
      orders: orders.length,
      toCook: columns.CONFIRMED.length,
      preparing: columns.PREPARING.length,
      packed: columns.PACKED.length,
      items: cook.reduce((s, l) => s + l.total, 0),
    },
    columns,
  }
}

export function KitchenHome() {
  const { profile } = useBusinessProfile()
  const [dates, setDates] = useState<ProductionDate[]>([])
  const [activeDate, setActiveDate] = useState<string | null>(null)
  const [orders, setOrders] = useState<KitchenOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchProductionDates()
      .then((d) => {
        setDates(d)
        setActiveDate(d[0]?.date ?? null)
        if (d.length === 0) setLoading(false)
      })
      .catch(() => {
        setError('তথ্য লোড করা যায়নি')
        setLoading(false)
      })
  }, [])

  const loadDay = useCallback((date: string) => {
    setLoading(true)
    fetchProduction(date)
      .then((day) => setOrders(day.orders))
      .catch(() => setError('প্রোডাকশন লোড করা যায়নি'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (activeDate) loadDay(activeDate)
  }, [activeDate, loadDay])

  const board = useMemo(() => deriveBoard(orders), [orders])

  async function move(order: KitchenOrder, target: KitchenStage) {
    const prev = orders
    setOrders((os) => os.map((o) => (o.id === order.id ? { ...o, status: target } : o)))
    try {
      await setOrderStage(order.id, target)
    } catch {
      setOrders(prev) // revert on failure
      setError('স্ট্যাটাস পরিবর্তন করা যায়নি')
    }
  }

  return (
    <section className="kitchen">
      <h1>{profile.name} — কিচেন</h1>

      {dates.length > 0 && (
        <div className="kitchen-dates">
          {dates.map((d) => (
            <button
              key={d.date}
              className={d.date === activeDate ? 'kitchen-date kitchen-date--active' : 'kitchen-date'}
              onClick={() => setActiveDate(d.date)}
            >
              {d.date}
              <span>
                {bn(d.orderCount)} অর্ডার{d.toCook > 0 ? ` · ${bn(d.toCook)} বাকি` : ''}
              </span>
            </button>
          ))}
        </div>
      )}

      {error && <p className="muted">{error}</p>}
      {loading && <p className="muted">লোড হচ্ছে…</p>}

      {!loading && dates.length === 0 && (
        <div className="card">
          <p className="muted">নিশ্চিত করা কোনো অর্ডার নেই। অর্ডার নিশ্চিত হলে প্রোডাকশন এখানে দেখা যাবে।</p>
        </div>
      )}

      {!loading && orders.length > 0 && (
        <>
          {/* Cook summary — total to make per item today (updates live). */}
          <div className="cook-summary">
            <div className="cook-summary__head">
              <h2>আজ যা রান্না হবে</h2>
              <span className="muted">
                {bn(board.totals.orders)} অর্ডার · {bn(board.totals.items)} আইটেম
              </span>
            </div>
            <div className="cook-grid">
              {board.cook.map((c) => (
                <div key={c.productName} className={c.remaining === 0 ? 'cook-line cook-line--done' : 'cook-line'}>
                  <span className="cook-line__name">{c.productName}</span>
                  <span className="cook-line__nums">
                    {c.remaining > 0 ? (
                      <>
                        <strong>{bn(c.remaining)}</strong> বাকি <span className="muted">/ মোট {bn(c.total)}</span>
                      </>
                    ) : (
                      <span className="cook-line__ok">✓ সব প্রস্তুত ({bn(c.total)})</span>
                    )}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Per-order board (KDS): each order tracked independently. */}
          <div className="kds">
            {COLUMNS.map((col) => (
              <div key={col.stage} className={`kds-col kds-col--${col.stage.toLowerCase()}`}>
                <div className="kds-col__head">
                  <span className="kds-col__title">{col.title}</span>
                  <span className="kds-col__count">{bn(board.columns[col.stage].length)}</span>
                </div>
                <div className="kds-col__body">
                  {board.columns[col.stage].length === 0 && <p className="kds-col__empty">{col.hint}</p>}
                  {board.columns[col.stage].map((o) => (
                    <div key={o.id} className="kds-card">
                      <div className="kds-card__top">
                        <span className="kds-card__num">{o.orderNumber}</span>
                        <span className="kds-card__who">{o.recipientName}</span>
                      </div>
                      <ul className="kds-card__items">
                        {o.items.map((it, i) => (
                          <li key={i}>
                            <span className="kds-qty">{bn(it.quantity)}×</span> {it.productName}
                          </li>
                        ))}
                      </ul>
                      {o.note && <p className="kds-card__note">📝 {o.note}</p>}
                      <div className="kds-card__actions">
                        {o.status === 'CONFIRMED' && (
                          <button className="kds-btn kds-btn--go" onClick={() => move(o, 'PREPARING')}>
                            রান্না শুরু →
                          </button>
                        )}
                        {o.status === 'PREPARING' && (
                          <>
                            <button className="kds-btn kds-btn--back" onClick={() => move(o, 'CONFIRMED')} title="ফেরান">
                              ↩
                            </button>
                            <button className="kds-btn kds-btn--go" onClick={() => move(o, 'PACKED')}>
                              প্যাক সম্পন্ন ✓
                            </button>
                          </>
                        )}
                        {o.status === 'PACKED' && (
                          <button className="kds-btn kds-btn--back" onClick={() => move(o, 'PREPARING')} title="ফেরান">
                            ↩ ফেরান
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </section>
  )
}

import { useCallback, useEffect, useState } from 'react'
import { useBusinessProfile } from '../context/BusinessProfileContext'
import { fetchProduction, fetchProductionDates, moveLine, moveProduct } from '../lib/kitchen'
import type {
  KitchenStage,
  OrderDerivedStatus,
  ProductControl,
  ProductionDate,
  ProductionDay,
  StageLineRef,
} from '../types/kitchen'
import './Kitchen.css'

const bn = (n: number) => n.toLocaleString('bn-BD')

const stageLabel: Record<KitchenStage, string> = {
  TO_COOK: 'রান্নার জন্য',
  PREPARING: 'তৈরি হচ্ছে',
  READY: 'প্রস্তুত',
}
const orderStatusLabel: Record<OrderDerivedStatus, string> = {
  CONFIRMED: 'রান্নার জন্য',
  PREPARING: 'তৈরি হচ্ছে',
  PACKED: 'প্রস্তুত',
}
const NEXT: Record<KitchenStage, KitchenStage | null> = { TO_COOK: 'PREPARING', PREPARING: 'READY', READY: null }
const PREV: Record<KitchenStage, KitchenStage | null> = { TO_COOK: null, PREPARING: 'TO_COOK', READY: 'PREPARING' }

interface Picker {
  productName: string
  target: KitchenStage
  lines: StageLineRef[]
}

export function KitchenHome() {
  const { profile } = useBusinessProfile()
  const [dates, setDates] = useState<ProductionDate[]>([])
  const [activeDate, setActiveDate] = useState<string | null>(null)
  const [day, setDay] = useState<ProductionDay | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [picker, setPicker] = useState<Picker | null>(null)

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
      .then(setDay)
      .catch(() => setError('প্রোডাকশন লোড করা যায়নি'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (activeDate) loadDay(activeDate)
  }, [activeDate, loadDay])

  async function run(fn: () => Promise<ProductionDay>) {
    setBusy(true)
    setError(null)
    try {
      setDay(await fn())
    } catch {
      setError('পরিবর্তন করা যায়নি')
    } finally {
      setBusy(false)
    }
  }

  const line = (lineId: string, stage: KitchenStage) => run(() => moveLine(lineId, stage))
  const bulk = (p: ProductControl, from: KitchenStage, to: KitchenStage) =>
    run(() => moveProduct(activeDate!, p.productId, from, to))

  function openPicker(p: ProductControl, stage: KitchenStage) {
    const target = PREV[stage]
    if (!target) return
    setPicker({ productName: p.productName, target, lines: p.stages[stage].lines })
  }

  async function pickBack(lineId: string) {
    if (!picker) return
    await line(lineId, picker.target)
    setPicker(null)
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

      {error && <p className="kitchen-error">{error}</p>}
      {loading && <p className="muted">লোড হচ্ছে…</p>}

      {!loading && dates.length === 0 && (
        <div className="card">
          <p className="muted">নিশ্চিত করা কোনো অর্ডার নেই। অর্ডার নিশ্চিত হলে প্রোডাকশন এখানে দেখা যাবে।</p>
        </div>
      )}

      {!loading && day && day.orders.length > 0 && (
        <div className={busy ? 'kitchen-body kitchen-body--busy' : 'kitchen-body'}>
          {/* ---- Product-wise control ---- */}
          <div className="prod-panel">
            <div className="prod-panel__head">
              <h2>পণ্যভিত্তিক নিয়ন্ত্রণ</h2>
              <span className="muted">
                {bn(day.totals.orders)} অর্ডার · {bn(day.totals.items)} আইটেম
              </span>
            </div>
            <div className="prod-list">
              {day.products.map((p) => (
                <div key={p.productId ?? p.productName} className="prod-row">
                  <span className="prod-row__name">{p.productName}</span>
                  <div className="prod-row__stages">
                    {(['TO_COOK', 'PREPARING', 'READY'] as KitchenStage[]).map((s) => (
                      <div key={s} className={`prod-stage prod-stage--${s.toLowerCase()}`}>
                        <span className="prod-stage__label">{stageLabel[s]}</span>
                        <span className="prod-stage__qty">{bn(p.stages[s].qty)}</span>
                        <div className="prod-stage__acts">
                          {PREV[s] && p.stages[s].qty > 0 && (
                            <button className="mini mini--back" title="একটি অর্ডার ফেরান" onClick={() => openPicker(p, s)}>
                              ↩
                            </button>
                          )}
                          {NEXT[s] && p.stages[s].qty > 0 && (
                            <button className="mini mini--go" onClick={() => bulk(p, s, NEXT[s]!)}>
                              সব →
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ---- Per-order cards with per-line controls ---- */}
          <div className="ord-list">
            {day.orders.map((o) => (
              <div key={o.id} className={`ord-card ord-card--${o.status.toLowerCase()}`}>
                <div className="ord-card__head">
                  <span className="ord-card__num">{o.orderNumber}</span>
                  <span className={`ord-chip ord-chip--${o.status.toLowerCase()}`}>{orderStatusLabel[o.status]}</span>
                </div>
                <div className="ord-card__who">{o.recipientName}</div>
                {o.note && <p className="ord-card__note">📝 {o.note}</p>}
                <ul className="ord-lines">
                  {o.lines.map((l) => (
                    <li key={l.id} className={`ord-line ord-line--${l.stage.toLowerCase()}`}>
                      <span className="ord-line__item">
                        <span className="ord-line__qty">{bn(l.quantity)}×</span> {l.productName}
                      </span>
                      <span className="ord-line__stage">{stageLabel[l.stage]}</span>
                      <span className="ord-line__acts">
                        {PREV[l.stage] && (
                          <button className="mini mini--back" title="পেছনে" onClick={() => line(l.id, PREV[l.stage]!)}>
                            ↩
                          </button>
                        )}
                        {NEXT[l.stage] && (
                          <button className="mini mini--go" title="এগিয়ে" onClick={() => line(l.id, NEXT[l.stage]!)}>
                            →
                          </button>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ---- Backward order picker ---- */}
      {picker && (
        <div className="picker-overlay" onClick={() => setPicker(null)}>
          <div className="picker" onClick={(e) => e.stopPropagation()}>
            <div className="picker__head">
              <strong>{picker.productName}</strong> — কোন অর্ডার “{stageLabel[picker.target]}”-এ ফেরাবেন?
            </div>
            <ul className="picker__list">
              {picker.lines.map((l) => (
                <li key={l.lineId}>
                  <span>
                    <strong>{l.orderNumber}</strong> · {l.recipientName} · {bn(l.quantity)}×
                  </span>
                  <button className="mini mini--back" onClick={() => pickBack(l.lineId)}>
                    ফেরান
                  </button>
                </li>
              ))}
            </ul>
            <button className="picker__close" onClick={() => setPicker(null)}>
              বন্ধ
            </button>
          </div>
        </div>
      )}
    </section>
  )
}

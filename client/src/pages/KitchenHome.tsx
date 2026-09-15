import { useCallback, useEffect, useState } from 'react'
import { useBusinessProfile } from '../context/BusinessProfileContext'
import { useI18n } from '../context/LanguageContext'
import { useContentLang } from '../context/TranslationContext'
import { fetchProduction, fetchProductionDates, moveLine, moveProduct, packOrder } from '../lib/kitchen'
import { pick, localeDigits } from '../lib/i18n'
import type {
  KitchenStage,
  OrderKitchenStatus,
  ProductControl,
  ProductionDate,
  ProductionDay,
  StageLineRef,
} from '../types/kitchen'
import './Kitchen.css'

const bn = (n: number) => localeDigits(n)

const stageLabel: Record<KitchenStage, string> = {
  get TO_COOK() {
    return pick('রান্নার জন্য', 'To cook')
  },
  get PREPARING() {
    return pick('তৈরি হচ্ছে', 'Preparing')
  },
  get READY() {
    return pick('প্রস্তুত', 'Ready')
  },
}
const orderStatusLabel: Record<OrderKitchenStatus, string> = {
  get CONFIRMED() {
    return pick('রান্নার জন্য', 'To cook')
  },
  get PREPARING() {
    return pick('তৈরি হচ্ছে', 'Preparing')
  },
  get READY() {
    return pick('প্রস্তুত (প্যাক বাকি)', 'Ready (to pack)')
  },
  get PACKED() {
    return pick('প্যাকড ✓', 'Packed ✓')
  },
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
  const { t } = useI18n()
  const { lc } = useContentLang()
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
        setError(t('তথ্য লোড করা যায়নি', 'Could not load data'))
        setLoading(false)
      })
  }, [])

  const loadDay = useCallback((date: string) => {
    setLoading(true)
    fetchProduction(date)
      .then(setDay)
      .catch(() => setError(t('প্রোডাকশন লোড করা যায়নি', 'Could not load production')))
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
      setError(t('পরিবর্তন করা যায়নি', 'Could not apply the change'))
    } finally {
      setBusy(false)
    }
  }

  const line = (lineId: string, stage: KitchenStage) => run(() => moveLine(lineId, stage))
  const bulk = (p: ProductControl, from: KitchenStage, to: KitchenStage) =>
    run(() => moveProduct(activeDate!, p.productId, from, to))
  const pack = (orderId: string, packed: boolean) => run(() => packOrder(orderId, packed))

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
      <h1>{lc(profile.name, profile.nameEnglish)} — {t('কিচেন', 'Kitchen')}</h1>

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
                {bn(d.orderCount)} {t('অর্ডার', 'orders')}{d.toCook > 0 ? ` · ${bn(d.toCook)} ${t('বাকি', 'left')}` : ''}
              </span>
            </button>
          ))}
        </div>
      )}

      {error && <p className="kitchen-error">{error}</p>}
      {loading && <p className="muted">{t('লোড হচ্ছে…', 'Loading…')}</p>}

      {!loading && dates.length === 0 && (
        <div className="card">
          <p className="muted">{t('নিশ্চিত করা কোনো অর্ডার নেই। অর্ডার নিশ্চিত হলে প্রোডাকশন এখানে দেখা যাবে।', 'No confirmed orders. Production will appear here once orders are confirmed.')}</p>
        </div>
      )}

      {!loading && day && day.orders.length > 0 && (
        <div className={busy ? 'kitchen-body kitchen-body--busy' : 'kitchen-body'}>
          {/* ---- Product-wise control ---- */}
          <div className="prod-panel">
            <div className="prod-panel__head">
              <h2>{t('পণ্যভিত্তিক নিয়ন্ত্রণ', 'Product-wise control')}</h2>
              <span className="muted">
                {bn(day.totals.orders)} {t('অর্ডার', 'orders')} · {bn(day.totals.items)} {t('আইটেম', 'items')}
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
                            <button className="mini mini--back" title={t('একটি অর্ডার ফেরান', 'Move one order back')} onClick={() => openPicker(p, s)}>
                              ↩
                            </button>
                          )}
                          {NEXT[s] && p.stages[s].qty > 0 && (
                            <button className="mini mini--go" onClick={() => bulk(p, s, NEXT[s]!)}>
                              {t('সব', 'All')} →
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
                          <button className="mini mini--back" title={t('পেছনে', 'Back')} onClick={() => line(l.id, PREV[l.stage]!)}>
                            ↩
                          </button>
                        )}
                        {NEXT[l.stage] && (
                          <button className="mini mini--go" title={t('এগিয়ে', 'Forward')} onClick={() => line(l.id, NEXT[l.stage]!)}>
                            →
                          </button>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>

                {/* Order-level packing — a step after all items are cooked. */}
                {o.status === 'READY' && (
                  <button className="ord-pack ord-pack--do" onClick={() => pack(o.id, true)}>
                    📦 {t('প্যাক সম্পন্ন', 'Packing done')}
                  </button>
                )}
                {o.status === 'PACKED' && (
                  <div className="ord-packed">
                    <span>✓ {t('প্যাক করা হয়েছে — ডেলিভারির জন্য প্রস্তুত', 'Packed — ready for delivery')}</span>
                    <button className="mini mini--back" onClick={() => pack(o.id, false)}>
                      ↩ {t('আনপ্যাক', 'Unpack')}
                    </button>
                  </div>
                )}
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
              <strong>{picker.productName}</strong> — {t(`কোন অর্ডার “${stageLabel[picker.target]}”-এ ফেরাবেন?`, `Which order to move back to “${stageLabel[picker.target]}”?`)}
            </div>
            <ul className="picker__list">
              {picker.lines.map((l) => (
                <li key={l.lineId}>
                  <span>
                    <strong>{l.orderNumber}</strong> · {l.recipientName} · {bn(l.quantity)}×
                  </span>
                  <button className="mini mini--back" onClick={() => pickBack(l.lineId)}>
                    {t('ফেরান', 'Move back')}
                  </button>
                </li>
              ))}
            </ul>
            <button className="picker__close" onClick={() => setPicker(null)}>
              {t('বন্ধ', 'Close')}
            </button>
          </div>
        </div>
      )}
    </section>
  )
}

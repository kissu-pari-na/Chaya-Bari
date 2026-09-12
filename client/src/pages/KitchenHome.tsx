import { useCallback, useEffect, useState } from 'react'
import { useBusinessProfile } from '../context/BusinessProfileContext'
import { fetchProduction, fetchProductionDates, updateKitchenStatus } from '../lib/kitchen'
import type { KitchenStatus, ProductionDate, ProductionDay } from '../types/kitchen'
import './Kitchen.css'

const statusLabel: Record<KitchenStatus, string> = {
  PENDING: 'বাকি',
  PREPARING: 'তৈরি হচ্ছে',
  PREPARED: 'তৈরি',
  PACKED: 'প্যাকড',
}

// Tapping the status button advances to the next stage (and wraps around).
const nextStatus: Record<KitchenStatus, KitchenStatus> = {
  PENDING: 'PREPARING',
  PREPARING: 'PREPARED',
  PREPARED: 'PACKED',
  PACKED: 'PENDING',
}

export function KitchenHome() {
  const { profile } = useBusinessProfile()
  const [dates, setDates] = useState<ProductionDate[]>([])
  const [activeDate, setActiveDate] = useState<string | null>(null)
  const [day, setDay] = useState<ProductionDay | null>(null)
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
      .then(setDay)
      .catch(() => setError('প্রোডাকশন লোড করা যায়নি'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (activeDate) loadDay(activeDate)
  }, [activeDate, loadDay])

  async function advance(productId: string | null, current: KitchenStatus) {
    if (!productId || !activeDate || !day) return
    const target = nextStatus[current]
    // Optimistic update.
    setDay({ ...day, items: day.items.map((i) => (i.productId === productId ? { ...i, status: target } : i)) })
    try {
      await updateKitchenStatus(activeDate, productId, target)
    } catch {
      loadDay(activeDate)
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
              <span>{d.orderCount} অর্ডার</span>
            </button>
          ))}
        </div>
      )}

      {error && <p className="muted">{error}</p>}
      {loading && <p className="muted">লোড হচ্ছে…</p>}

      {!loading && dates.length === 0 && (
        <div className="card">
          <p className="muted">নিশ্চিত করা কোনো অর্ডার নেই। অর্ডার নিশ্চিত হলে প্রোডাকশন তালিকা এখানে দেখা যাবে।</p>
        </div>
      )}

      {!loading && day && (
        <>
          <div className="kitchen-summary">
            <div className="kitchen-stat">
              <span className="kitchen-stat__value">{day.totalOrders}</span>
              <span className="kitchen-stat__label">মোট অর্ডার</span>
            </div>
            <div className="kitchen-stat">
              <span className="kitchen-stat__value">{day.totalItems}</span>
              <span className="kitchen-stat__label">মোট আইটেম</span>
            </div>
          </div>

          <div className="kitchen-list">
            {day.items.map((item) => (
              <div key={item.productId ?? item.productName} className={`kitchen-item kitchen-item--${item.status.toLowerCase()}`}>
                <div className="kitchen-item__info">
                  <span className="kitchen-item__name">{item.productName}</span>
                  <span className="kitchen-item__meta">{item.orderCount} অর্ডার</span>
                </div>
                <span className="kitchen-item__qty">{item.quantity}</span>
                <button
                  className="kitchen-item__status"
                  disabled={!item.productId}
                  onClick={() => advance(item.productId, item.status)}
                >
                  {statusLabel[item.status]}
                </button>
              </div>
            ))}
            {day.items.length === 0 && <p className="muted">এই দিনের জন্য কোনো আইটেম নেই।</p>}
          </div>

          {day.notes.length > 0 && (
            <div className="kitchen-notes">
              <h2>বিশেষ নোট</h2>
              {day.notes.map((n) => (
                <div key={n.orderNumber} className="kitchen-note">
                  <strong>{n.orderNumber}</strong> ({n.recipientName}): {n.note}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </section>
  )
}

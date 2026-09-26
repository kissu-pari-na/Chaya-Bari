import { useState, type MouseEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCart } from '../context/CartContext'
import { useI18n } from '../context/LanguageContext'
import { fetchProducts } from '../lib/products'
import { effectivePrice } from '../types/product'
import type { Order } from '../types/order'
import './ReorderButton.css'

/// What the cart page shows after an "order again".
export interface ReorderNotice {
  orderNumber: string
  added: number
  /// Items from the old order that can't be ordered any more.
  skipped: string[]
  /// Whether any item's price differs from what was paid last time.
  priceChanged: boolean
}

/// "Order again": puts a previous order's items into the cart at today's
/// prices, skipping anything no longer on sale, then opens the cart where the
/// customer can change quantities, remove items or add more before checkout.
/// If the cart already has something in it, the customer chooses whether to
/// replace it or add to it.
export function ReorderButton({ order, compact = false }: { order: Order; compact?: boolean }) {
  const { t } = useI18n()
  const { items: cartItems, addMany } = useCart()
  const navigate = useNavigate()
  const [choosing, setChoosing] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // The button may sit inside a clickable order row; keep clicks here.
  const stop = (e: MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  async function reorder(mode: 'replace' | 'merge') {
    setBusy(true)
    setError(null)
    try {
      const products = await fetchProducts()
      const byId = new Map(products.map((p) => [p.id, p]))
      const lines: { product: (typeof products)[number]; quantity: number }[] = []
      const skipped: string[] = []
      let priceChanged = false
      for (const item of order.items) {
        const product = item.productId ? byId.get(item.productId) : undefined
        if (!product || !product.isAvailable) {
          skipped.push(item.productName)
          continue
        }
        if (effectivePrice(product) !== item.unitPrice) priceChanged = true
        lines.push({ product, quantity: item.quantity })
      }
      if (lines.length > 0) addMany(lines, mode)
      const notice: ReorderNotice = {
        orderNumber: order.orderNumber,
        added: lines.length,
        skipped,
        priceChanged,
      }
      navigate('/cart', { state: { reorder: notice } })
    } catch {
      setError(t('আবার অর্ডার করা যায়নি, আবার চেষ্টা করুন।', 'Could not reorder — please try again.'))
    } finally {
      setBusy(false)
      setChoosing(false)
    }
  }

  function start(e: MouseEvent) {
    stop(e)
    if (cartItems.length > 0) setChoosing((c) => !c)
    else void reorder('replace')
  }

  return (
    <span className={compact ? 'reorder reorder--compact' : 'reorder'} onClick={stop}>
      <button type="button" className="btn btn--ghost reorder__btn" onClick={start} disabled={busy}>
        🔁 {busy ? t('যোগ হচ্ছে…', 'Adding…') : t('আবার অর্ডার করুন', 'Order again')}
      </button>
      {choosing && (
        <span className="reorder__choice" role="dialog" aria-label={t('কার্টে আগে থেকে পণ্য আছে', 'Your cart already has items')}>
          <span className="reorder__choice-text">{t('কার্টে আগে থেকে পণ্য আছে।', 'Your cart already has items.')}</span>
          <button type="button" className="btn btn--brand" onClick={(e) => { stop(e); void reorder('replace') }} disabled={busy}>
            {t('কার্ট বদলে দিন', 'Replace cart')}
          </button>
          <button type="button" className="btn btn--ghost" onClick={(e) => { stop(e); void reorder('merge') }} disabled={busy}>
            {t('কার্টে যোগ করুন', 'Add to cart')}
          </button>
        </span>
      )}
      {error && <span className="hint hint--err">{error}</span>}
    </span>
  )
}

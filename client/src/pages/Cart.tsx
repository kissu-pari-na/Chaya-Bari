import { Link, useLocation } from 'react-router-dom'
import { useCart } from '../context/CartContext'
import { useI18n } from '../context/LanguageContext'
import { useContentLang } from '../context/TranslationContext'
import { formatBdt, toBnDigits } from '../lib/format'
import type { ReorderNotice } from '../components/ReorderButton'
import './Cart.css'

export function Cart() {
  const { items, subtotal, setQuantity, removeItem } = useCart()
  const { t } = useI18n()
  const { lc } = useContentLang()
  // Set when arriving from "Order again" on a previous order.
  const reorder = (useLocation().state as { reorder?: ReorderNotice } | null)?.reorder

  const reorderNote = reorder && (
    <div className="cart-reorder" role="status">
      {reorder.added > 0 ? (
        <p>
          🔁{' '}
          {t(
            `অর্ডার ${reorder.orderNumber}-এর ${toBnDigits(reorder.added)}টি পণ্য কার্টে যোগ হয়েছে। নিচে পরিমাণ বদলান, পণ্য সরান বা `,
            `${reorder.added} item(s) from order ${reorder.orderNumber} are in your cart. Change quantities, remove items below, or `,
          )}
          <Link to="/products">{t('আরও পণ্য যোগ করুন', 'add more items')}</Link>.
        </p>
      ) : (
        <p>
          {t(
            `অর্ডার ${reorder.orderNumber}-এর কোনো পণ্য এখন পাওয়া যাচ্ছে না।`,
            `None of the items from order ${reorder.orderNumber} are available right now.`,
          )}
        </p>
      )}
      {reorder.skipped.length > 0 && (
        <p className="muted small">
          {t('এখন পাওয়া যাচ্ছে না, তাই বাদ দেওয়া হয়েছে:', 'Not available now, so left out:')} {reorder.skipped.join(', ')}
        </p>
      )}
      {reorder.added > 0 && reorder.priceChanged && (
        <p className="muted small">
          {t('কিছু পণ্যের দাম আগের অর্ডার থেকে বদলেছে — আজকের দাম দেখানো হচ্ছে।', 'Some prices have changed since that order — today’s prices are shown.')}
        </p>
      )}
    </div>
  )

  if (items.length === 0) {
    return (
      <section className="cart-shell cart-shell--empty">
        <div className="orders-empty__icon" aria-hidden="true">🛒</div>
        <h1>{t('আপনার কার্ট', 'Your Cart')}</h1>
        {reorderNote}
        <p className="muted">{t('কার্ট খালি।', 'Your cart is empty.')}</p>
        <Link to="/products" className="btn btn--primary">{t('পণ্য দেখুন', 'Browse Products')}</Link>
      </section>
    )
  }

  return (
    <section className="cart-shell">
      <h1>{t('আপনার কার্ট', 'Your Cart')}</h1>
      {reorderNote}
      <ul className="cart-list">
        {items.map((item) => (
          <li key={item.productId} className="cart-item">
            <div className="cart-item__thumb">
              {item.imageUrl ? <img src={item.imageUrl} alt={lc(item.name, item.nameEnglish)} /> : <span>🍽️</span>}
            </div>
            <div className="cart-item__info">
              <span className="cart-item__name">{lc(item.name, item.nameEnglish)}</span>
              <span className="muted">{formatBdt(item.price)}</span>
            </div>
            <div className="cart-item__qty">
              <button onClick={() => setQuantity(item.productId, item.quantity - 1)}>−</button>
              <span>{item.quantity}</span>
              <button onClick={() => setQuantity(item.productId, item.quantity + 1)}>+</button>
            </div>
            <strong className="cart-item__total">{formatBdt(item.price * item.quantity)}</strong>
            <button className="cart-item__remove" onClick={() => removeItem(item.productId)} title={t('সরান', 'Remove')}>
              ✕
            </button>
          </li>
        ))}
      </ul>

      <div className="cart-summary">
        <div className="cart-summary__row">
          <span>{t('সাবটোটাল', 'Subtotal')}</span>
          <strong>{formatBdt(subtotal)}</strong>
        </div>
        <p className="muted small">{t('ডেলিভারি চার্জ চেকআউটে যোগ হবে।', 'Delivery charge is added at checkout.')}</p>
        <Link to="/checkout" className="cart-summary__checkout">
          {t('চেকআউট', 'Checkout')}
        </Link>
      </div>
    </section>
  )
}

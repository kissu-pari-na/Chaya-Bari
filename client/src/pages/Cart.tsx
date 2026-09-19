import { Link } from 'react-router-dom'
import { useCart } from '../context/CartContext'
import { useI18n } from '../context/LanguageContext'
import { useContentLang } from '../context/TranslationContext'
import { formatBdt } from '../lib/format'
import './Cart.css'

export function Cart() {
  const { items, subtotal, setQuantity, removeItem } = useCart()
  const { t } = useI18n()
  const { lc } = useContentLang()

  if (items.length === 0) {
    return (
      <section className="cart-shell cart-shell--empty">
        <div className="orders-empty__icon" aria-hidden="true">🛒</div>
        <h1>{t('আপনার কার্ট', 'Your Cart')}</h1>
        <p className="muted">{t('কার্ট খালি।', 'Your cart is empty.')}</p>
        <Link to="/products" className="btn btn--primary">{t('পণ্য দেখুন', 'Browse Products')}</Link>
      </section>
    )
  }

  return (
    <section className="cart-shell">
      <h1>{t('আপনার কার্ট', 'Your Cart')}</h1>
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

import { Link, useNavigate } from 'react-router-dom'
import { useCart } from '../context/CartContext'
import { useAuth } from '../context/AuthContext'
import { formatBdt } from '../lib/format'
import './Cart.css'

export function Cart() {
  const { items, subtotal, setQuantity, removeItem } = useCart()
  const { user } = useAuth()
  const navigate = useNavigate()

  if (items.length === 0) {
    return (
      <section className="cart-shell cart-shell--empty">
        <div className="orders-empty__icon" aria-hidden="true">🛒</div>
        <h1>আপনার কার্ট</h1>
        <p className="muted">কার্ট খালি।</p>
        <Link to="/products" className="btn btn--primary">পণ্য দেখুন</Link>
      </section>
    )
  }

  function handleCheckout() {
    if (!user) {
      navigate('/login', { state: { from: { pathname: '/checkout' } } })
    } else {
      navigate('/checkout')
    }
  }

  return (
    <section className="cart-shell">
      <h1>আপনার কার্ট</h1>
      <ul className="cart-list">
        {items.map((item) => (
          <li key={item.productId} className="cart-item">
            <div className="cart-item__thumb">
              {item.imageUrl ? <img src={item.imageUrl} alt={item.name} /> : <span>🍽️</span>}
            </div>
            <div className="cart-item__info">
              <span className="cart-item__name">{item.name}</span>
              <span className="muted">{formatBdt(item.price)}</span>
            </div>
            <div className="cart-item__qty">
              <button onClick={() => setQuantity(item.productId, item.quantity - 1)}>−</button>
              <span>{item.quantity}</span>
              <button onClick={() => setQuantity(item.productId, item.quantity + 1)}>+</button>
            </div>
            <strong className="cart-item__total">{formatBdt(item.price * item.quantity)}</strong>
            <button className="cart-item__remove" onClick={() => removeItem(item.productId)} title="সরান">
              ✕
            </button>
          </li>
        ))}
      </ul>

      <div className="cart-summary">
        <div className="cart-summary__row">
          <span>সাবটোটাল</span>
          <strong>{formatBdt(subtotal)}</strong>
        </div>
        <p className="muted small">ডেলিভারি চার্জ চেকআউটে যোগ হবে।</p>
        <button className="cart-summary__checkout" onClick={handleCheckout}>
          চেকআউট
        </button>
      </div>
    </section>
  )
}

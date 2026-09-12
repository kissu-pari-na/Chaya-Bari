import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useBusinessProfile } from '../context/BusinessProfileContext'
import { useAuth } from '../context/AuthContext'
import { useCart } from '../context/CartContext'
import { fetchProducts } from '../lib/products'
import { formatBdt } from '../lib/format'
import type { Product } from '../types/product'
import './Home.css'
import './Products.css'

const TRUST = [
  { icon: '🏠', title: 'ঘরে তৈরি', text: 'প্রতিটি পদ যত্ন করে বাড়িতে রান্না করা।' },
  { icon: '🥬', title: 'তাজা উপকরণ', text: 'প্রতিদিন বাছাই করা টাটকা উপকরণে।' },
  { icon: '🛵', title: 'সময়মতো ডেলিভারি', text: 'আপনার দুয়ারে নির্ভরযোগ্য পৌঁছানো।' },
  { icon: '📱', title: 'সহজ অর্ডার', text: 'কয়েক ক্লিকেই আগাম অর্ডার করুন।' },
]

export function CustomerHome() {
  const { profile } = useBusinessProfile()
  const { user } = useAuth()
  const { addItem } = useCart()
  const [featured, setFeatured] = useState<Product[]>([])

  useEffect(() => {
    fetchProducts()
      .then((p) => setFeatured(p.filter((x) => x.isAvailable).slice(0, 4)))
      .catch(() => setFeatured([]))
  }, [])

  return (
    <div className="home">
      {/* ---------- Hero ---------- */}
      <section className="hero">
        <div className="hero__content">
          <span className="eyebrow hero__eyebrow">{profile.tagline}</span>
          <h1 className="hero__title">
            <span>{profile.name}</span>-এ
            <br />
            স্বাগতম
          </h1>
          <p className="hero__lede">
            ঘরের মমতায় তৈরি খাঁটি স্বাদ — {profile.address.city}, {profile.address.country}-জুড়ে
            আগাম অর্ডার করুন, আর আমরা তাজা রান্না পৌঁছে দিই আপনার দুয়ারে।
          </p>
          <div className="hero__cta">
            <Link to="/products" className="btn btn--primary btn--lg">
              পণ্য দেখুন
            </Link>
            {!user && (
              <Link to="/register" className="btn btn--on-dark btn--lg">
                অ্যাকাউন্ট খুলুন
              </Link>
            )}
          </div>
          {user && (
            <p className="hero__welcome">
              আবার স্বাগতম, <strong>{user.name}</strong>! আজ কী অর্ডার করবেন?
            </p>
          )}
        </div>
        <div className="hero__art" aria-hidden="true">
          <div className="hero__plate">🍲</div>
        </div>
      </section>

      {/* ---------- Trust strip ---------- */}
      <div className="trust">
        {TRUST.map((t) => (
          <div key={t.title} className="trust__tile">
            <span className="trust__icon" aria-hidden="true">
              {t.icon}
            </span>
            <div>
              <p className="trust__title">{t.title}</p>
              <p className="trust__text">{t.text}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ---------- Featured ---------- */}
      <div className="section-head">
        <div>
          <span className="eyebrow">আমাদের রান্নাঘর থেকে</span>
          <h2 className="section-head__title">জনপ্রিয় পদ</h2>
        </div>
        <Link to="/products" className="btn btn--ghost">
          সব দেখুন →
        </Link>
      </div>

      {featured.length === 0 ? (
        <p className="home__featured-empty">
          আমাদের পূর্ণ মেনু দেখতে <Link to="/products">পণ্যের পাতায়</Link> যান।
        </p>
      ) : (
        <div className="product-grid">
          {featured.map((p) => (
            <Link key={p.id} to={`/products/${p.id}`} className="product-card">
              <div className="product-card__image">
                {p.imageUrl ? (
                  <img src={p.imageUrl} alt={p.name} />
                ) : (
                  <span className="product-card__placeholder">🍽️</span>
                )}
                {p.salePrice != null && p.salePrice < p.price && (
                  <span className="badge badge--sale product-card__badge product-card__badge--sale">
                    সেল
                  </span>
                )}
              </div>
              <div className="product-card__body">
                <h3>{p.name}</h3>
                {p.categoryName && <span className="product-card__cat">{p.categoryName}</span>}
                <div className="product-card__foot">
                  <span className="product-card__price">
                    {p.salePrice != null && p.salePrice < p.price ? (
                      <>
                        <strong>{formatBdt(p.salePrice)}</strong>{' '}
                        <s className="product-card__was">{formatBdt(p.price)}</s>
                      </>
                    ) : (
                      <strong>{formatBdt(p.price)}</strong>
                    )}
                  </span>
                  <button
                    className="product-card__add"
                    onClick={(e) => {
                      e.preventDefault()
                      addItem(p)
                    }}
                  >
                    + কার্ট
                  </button>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* ---------- Closing CTA ---------- */}
      <section className="cta-band">
        <div>
          <h2 className="cta-band__title">{profile.tagline}</h2>
          <p className="cta-band__text">
            আজই অর্ডার করুন — ঘরে তৈরি টাটকা খাবার পৌঁছে যাবে আপনার কাছে।
          </p>
        </div>
        <div className="cta-band__actions">
          <Link to="/products" className="btn btn--on-dark btn--lg">
            অর্ডার শুরু করুন
          </Link>
          {!user && (
            <Link to="/login" className="btn btn--on-dark btn--lg">
              লগইন
            </Link>
          )}
        </div>
      </section>
    </div>
  )
}

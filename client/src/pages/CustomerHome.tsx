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
  { icon: '🏠', title: '১০০% ঘরে তৈরি', text: 'প্রতিটি পদ যত্ন করে বাড়িতে রান্না করা।' },
  { icon: '🥬', title: 'তাজা উপকরণ', text: 'প্রতিদিন বাছাই করা টাটকা উপকরণে।' },
  { icon: '🛵', title: 'দ্রুত ডেলিভারি', text: 'আপনার দুয়ারে নির্ভরযোগ্য পৌঁছানো।' },
  { icon: '🧼', title: 'স্বাস্থ্যসম্মত', text: 'পরিচ্ছন্ন রান্নাঘর, নিরাপদ প্যাকেজিং।' },
]

const REVIEWS = [
  {
    name: 'সাদিয়া রহমান',
    meta: 'নিয়মিত ক্রেতা',
    stars: 5,
    text: 'একদম ঘরের মতো স্বাদ! বিরিয়ানি আর পায়েস দুটোই অসাধারণ ছিল। সময়মতো পৌঁছেছে।',
  },
  {
    name: 'তানভীর হাসান',
    meta: 'ঢাকা',
    stars: 5,
    text: 'তাজা, গরম আর পরিমাণে ভালো। পরিবারের সবাই পছন্দ করেছে। আবার অর্ডার করব।',
  },
  {
    name: 'নুসরাত জাহান',
    meta: 'কম্বো ক্রেতা',
    stars: 4,
    text: 'কম্বো ডিলগুলো দারুণ সাশ্রয়ী। খাবারের মান নিয়ে কোনো অভিযোগ নেই।',
  },
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
          <span className="hero__trust">✦ ১০০% ঘরে তৈরি</span>
          <h1 className="hero__title">
            খাঁটি <span>ঘরোয়া</span> খাবার
          </h1>
          <p className="hero__sub">তাজা রান্না, একদম ঘরের মতো</p>
          <p className="hero__lede">
            {profile.name} থেকে ঘরের মমতায় তৈরি খাবার আগাম অর্ডার করুন — {profile.address.city},{' '}
            {profile.address.country}-জুড়ে আমরা তাজা রান্না পৌঁছে দিই আপনার দুয়ারে।
          </p>
          <div className="hero__cta">
            <Link to="/products" className="btn btn--primary btn--lg">
              অর্ডার করুন
            </Link>
            <Link to="/products" className="btn btn--on-dark btn--lg">
              মেনু দেখুন
            </Link>
          </div>
          {user && (
            <p className="hero__welcome">
              আবার স্বাগতম, <strong>{user.name}</strong>! আজ কী অর্ডার করবেন?
            </p>
          )}
        </div>
        <div className="hero__art" aria-hidden="true">
          <div className="hero__plate">
            🍲
            <div className="hero__rating">
              ৪.৯ ★<span>৫০০+ রিভিউ</span>
            </div>
          </div>
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

      {/* ---------- Featured dishes ---------- */}
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

      {/* ---------- Promo / combo band ---------- */}
      <section className="promo">
        <div>
          <h2 className="promo__title">
            সেরা কম্বো — <span>আরও সাশ্রয়ে!</span>
          </h2>
          <p className="promo__text">
            পরিবারের জন্য বাছাই করা কম্বো প্যাকে বেশি খাবার, কম দামে। ঘরে তৈরি স্বাদ উপভোগ করুন
            আরও সাশ্রয়ে।
          </p>
        </div>
        <Link to="/products" className="btn btn--primary btn--lg">
          কম্বো দেখুন
        </Link>
      </section>

      {/* ---------- Reviews ---------- */}
      <div className="section-head">
        <div>
          <span className="eyebrow">ক্রেতাদের কথা</span>
          <h2 className="section-head__title">সবাই যা বলছেন</h2>
        </div>
      </div>
      <div className="reviews">
        {REVIEWS.map((r) => (
          <div key={r.name} className="review">
            <div className="review__stars" aria-label={`${r.stars} star`}>
              {'★'.repeat(r.stars)}
              {'☆'.repeat(5 - r.stars)}
            </div>
            <p className="review__text">“{r.text}”</p>
            <div className="review__who">
              <span className="review__avatar" aria-hidden="true">
                {r.name.charAt(0)}
              </span>
              <div>
                <div className="review__name">{r.name}</div>
                <div className="review__meta">{r.meta}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ---------- Footer ---------- */}
      <footer className="home-footer">
        <div>
          <div className="home-footer__brand">{profile.name}</div>
          <div>{profile.tagline}</div>
        </div>
        <div>
          {profile.contact.phone} · {profile.contact.email}
        </div>
      </footer>
    </div>
  )
}

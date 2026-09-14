import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useBusinessProfile } from '../context/BusinessProfileContext'
import { useAuth } from '../context/AuthContext'
import { useI18n } from '../context/LanguageContext'
import { fetchProducts } from '../lib/products'
import { fetchRatingSummary, fetchTopReviews } from '../lib/reviews'
import { formatBdt, toBnDigits } from '../lib/format'
import { ProductCard } from '../components/ProductCard'
import { effectivePrice, type Product } from '../types/product'
import type { RatingSummary, Review } from '../types/review'
import './Home.css'
import './Products.css'

// Fallback food emoji for a product with no uploaded image yet — matched to the
// product name/category so the placeholder still looks sensible.
function dishEmoji(p: Product, index: number): string {
  const hay = `${p.name} ${p.categoryName ?? ''}`
  const rules: [RegExp, string][] = [
    [/বিরিয়ানি|ভাত|পোলাও|খিচুড়ি/, '🍛'],
    [/কেক/, '🍰'],
    [/পুডিং|পায়েস|মিষ্টি|মিষ্টান্ন|ফিরনি/, '🍮'],
    [/সিঙ্গারা|সমুচা|পুরি|স্ন্যাক/, '🥟'],
    [/বান|রুটি|পরোটা|নান/, '🥯'],
    [/মাংস|গরু|মুরগি|কালা ভুনা|রোস্ট/, '🍖'],
    [/চা|কফি|জুস|শরবত/, '🥤'],
  ]
  const hit = rules.find(([re]) => re.test(hay))
  return hit ? hit[1] : ['🍲', '🥘', '🍽️'][index % 3]
}

export function CustomerHome() {
  const { profile } = useBusinessProfile()
  const { user } = useAuth()
  const { t } = useI18n()
  const [products, setProducts] = useState<Product[]>([])
  const [topReviews, setTopReviews] = useState<Review[]>([])
  const [rating, setRating] = useState<RatingSummary | null>(null)

  useEffect(() => {
    fetchProducts()
      .then(setProducts)
      .catch(() => setProducts([]))
    fetchTopReviews()
      .then(setTopReviews)
      .catch(() => setTopReviews([]))
    fetchRatingSummary()
      .then(setRating)
      .catch(() => setRating(null))
  }, [])

  const TRUST = [
    { icon: '🏠', title: t('১০০% ঘরে তৈরি', '100% Homemade'), text: t('প্রতিটি পদ যত্ন করে বাড়িতে রান্না করা।', 'Every dish carefully cooked at home.') },
    { icon: '🥬', title: t('তাজা উপকরণ', 'Fresh Ingredients'), text: t('প্রতিদিন বাছাই করা টাটকা উপকরণে।', 'Handpicked fresh ingredients every day.') },
    { icon: '🛵', title: t('দ্রুত ডেলিভারি', 'Fast Delivery'), text: t('আপনার দুয়ারে নির্ভরযোগ্য পৌঁছানো।', 'Reliable delivery right to your door.') },
    { icon: '🧼', title: t('স্বাস্থ্যসম্মত', 'Hygienic'), text: t('পরিচ্ছন্ন রান্নাঘর, নিরাপদ প্যাকেজিং।', 'Clean kitchen, safe packaging.') },
  ]

  const REVIEWS = [
    {
      name: t('সাদিয়া রহমান', 'Sadia Rahman'),
      meta: t('নিয়মিত ক্রেতা', 'Regular customer'),
      stars: 5,
      text: t(
        'একদম ঘরের মতো স্বাদ! বিরিয়ানি আর পায়েস দুটোই অসাধারণ ছিল। সময়মতো পৌঁছেছে।',
        'Tastes just like home! The biryani and payesh were both excellent. Arrived on time.',
      ),
    },
    {
      name: t('তানভীর হাসান', 'Tanvir Hasan'),
      meta: t('ঢাকা', 'Dhaka'),
      stars: 5,
      text: t(
        'তাজা, গরম আর পরিমাণে ভালো। পরিবারের সবাই পছন্দ করেছে। আবার অর্ডার করব।',
        'Fresh, hot and generous portions. The whole family loved it. Will order again.',
      ),
    },
    {
      name: t('নুসরাত জাহান', 'Nusrat Jahan'),
      meta: t('কম্বো ক্রেতা', 'Combo buyer'),
      stars: 4,
      text: t(
        'কম্বো ডিলগুলো দারুণ সাশ্রয়ী। খাবারের মান নিয়ে কোনো অভিযোগ নেই।',
        'The combo deals are great value. No complaints about the food quality.',
      ),
    },
  ]

  const available = products.filter((p) => p.isAvailable)
  const featured = available.slice(0, 4)
  // Top 4 by rating (then review count) for the animated hero showcase; the #1
  // product sits in the centre, the next three orbit around it.
  const ranked = [...available].sort(
    (a, b) => b.avgRating - a.avgRating || b.reviewCount - a.reviewCount,
  )
  const centerProduct = ranked[0]
  const satelliteProducts = ranked.slice(1, 4)

  // Real reviews when available; otherwise fall back to sample testimonials.
  const showReviews = topReviews.length > 0
  const hasRating = rating != null && rating.count > 0

  const renderOrb = (p: Product, className: string, emojiIndex: number, crown: boolean) => (
    <Link
      key={p.id}
      to={`/products/${p.id}`}
      className={className}
      aria-label={`${p.name} — ${formatBdt(effectivePrice(p))}`}
    >
      <span className="hero__orb-disc">
        {p.imageUrl ? (
          <img src={p.imageUrl} alt="" />
        ) : (
          <span className="hero__orb-emoji" aria-hidden="true">
            {dishEmoji(p, emojiIndex)}
          </span>
        )}
        {crown && (
          <span className="hero__orb-crown" aria-hidden="true">
            👑
          </span>
        )}
      </span>
      <span className="hero__orb-cap">
        <span className="hero__orb-name">{p.name}</span>
        <span className="hero__orb-price">
          {formatBdt(effectivePrice(p))}
          {p.reviewCount > 0 && (
            <span className="hero__orb-star"> · {toBnDigits(p.avgRating.toFixed(1))}★</span>
          )}
        </span>
      </span>
    </Link>
  )

  return (
    <div className="home">
      {/* ---------- Hero ---------- */}
      <section className="hero">
        <div className="hero__content">
          <span className="hero__trust">✦ {t('১০০% ঘরে তৈরি', '100% Homemade')}</span>
          <h1 className="hero__title">
            {t('খাঁটি', 'Authentic')} <span>{t('ঘরোয়া', 'Home-style')}</span> {t('খাবার', 'Food')}
          </h1>
          <p className="hero__sub">{profile.tagline}</p>
          <p className="hero__lede">
            {t(
              `${profile.name} থেকে ঘরের মমতায় তৈরি খাবার আগাম অর্ডার করুন — ${profile.address.city}, ${profile.address.country}-জুড়ে আমরা তাজা রান্না পৌঁছে দিই আপনার দুয়ারে।`,
              `Pre-order lovingly home-cooked food from ${profile.name} — across ${profile.address.city}, ${profile.address.country} we deliver freshly cooked meals to your door.`,
            )}
          </p>
          <div className="hero__cta">
            <Link to="/products" className="btn btn--primary btn--lg">
              {t('অর্ডার করুন', 'Order Now')}
            </Link>
            <Link to="/products" className="btn btn--on-dark btn--lg">
              {t('মেনু দেখুন', 'View Menu')}
            </Link>
          </div>
          {user && (
            <p className="hero__welcome">
              {t('আবার স্বাগতম,', 'Welcome back,')} <strong>{user.name}</strong>!{' '}
              {t('আজ কী অর্ডার করবেন?', 'What will you order today?')}
            </p>
          )}
        </div>
        <div className="hero__art">
          <div className="hero__stage">
            <span className="hero__ring hero__ring--outer" aria-hidden="true" />
            <span className="hero__ring hero__ring--inner" aria-hidden="true" />
            <span className="hero__glow" aria-hidden="true" />

            {/* #1 top-rated product sits in the centre; the next three orbit it. */}
            {centerProduct
              ? renderOrb(centerProduct, 'hero__orb hero__orb--center', 0, true)
              : (
                <span className="hero__core" aria-hidden="true">
                  🍲
                </span>
              )}

            {satelliteProducts.map((p, i) =>
              renderOrb(p, `hero__orb hero__orb--${i + 1}`, i + 1, false),
            )}

            {/* Only show a rating badge once real reviews exist. */}
            {hasRating && (
              <div className="hero__rating">
                {toBnDigits(rating!.average.toFixed(1))} ★
                <span>
                  {toBnDigits(rating!.count)}+ {t('রিভিউ', 'reviews')}
                </span>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ---------- Trust strip ---------- */}
      <div className="trust">
        {TRUST.map((item) => (
          <div key={item.title} className="trust__tile">
            <span className="trust__icon" aria-hidden="true">
              {item.icon}
            </span>
            <div>
              <p className="trust__title">{item.title}</p>
              <p className="trust__text">{item.text}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ---------- Featured dishes ---------- */}
      <div className="section-head">
        <div>
          <span className="eyebrow">{t('আমাদের রান্নাঘর থেকে', 'From our kitchen')}</span>
          <h2 className="section-head__title">{t('জনপ্রিয় পদ', 'Popular Dishes')}</h2>
        </div>
        <Link to="/products" className="btn btn--ghost">
          {t('সব দেখুন', 'View all')} →
        </Link>
      </div>

      {featured.length === 0 ? (
        <p className="home__featured-empty">
          {t('আমাদের পূর্ণ মেনু দেখতে', 'To see our full menu visit the')}{' '}
          <Link to="/products">{t('পণ্যের পাতায়', 'products page')}</Link>{' '}
          {t('যান।', '.')}
        </p>
      ) : (
        <div className="product-grid">
          {featured.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}

      {/* ---------- Promo / combo band ---------- */}
      <section className="promo">
        <div>
          <h2 className="promo__title">
            {t('সেরা কম্বো —', 'Best Combos —')} <span>{t('আরও সাশ্রয়ে!', 'even better value!')}</span>
          </h2>
          <p className="promo__text">
            {t(
              'পরিবারের জন্য বাছাই করা কম্বো প্যাকে বেশি খাবার, কম দামে। ঘরে তৈরি স্বাদ উপভোগ করুন আরও সাশ্রয়ে।',
              'Curated family combo packs — more food, less cost. Enjoy home-cooked taste for even less.',
            )}
          </p>
        </div>
        <Link to="/products" className="btn btn--primary btn--lg">
          {t('কম্বো দেখুন', 'View Combos')}
        </Link>
      </section>

      {/* ---------- Reviews ---------- */}
      <div className="section-head">
        <div>
          <span className="eyebrow">{t('ক্রেতাদের কথা', 'What customers say')}</span>
          <h2 className="section-head__title">{t('সবাই যা বলছেন', 'Everyone is talking')}</h2>
        </div>
      </div>
      <div className="reviews">
        {showReviews
          ? topReviews.map((r) => (
              <div key={r.id} className="review">
                <div className="review__stars" aria-label={`${r.rating} star`}>
                  {'★'.repeat(r.rating)}
                  {'☆'.repeat(5 - r.rating)}
                </div>
                <p className="review__text">“{r.comment}”</p>
                <div className="review__who">
                  <span className="review__avatar" aria-hidden="true">
                    {r.customerName.charAt(0)}
                  </span>
                  <div>
                    <div className="review__name">{r.customerName}</div>
                    <div className="review__meta">{r.productName ?? t('যাচাইকৃত ক্রেতা', 'Verified buyer')}</div>
                  </div>
                </div>
              </div>
            ))
          : REVIEWS.map((r) => (
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

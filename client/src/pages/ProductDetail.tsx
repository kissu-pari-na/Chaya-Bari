import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { fetchProduct } from '../lib/products'
import { formatBdt } from '../lib/format'
import { useCart } from '../context/CartContext'
import { useI18n } from '../context/LanguageContext'
import { RatingStars } from '../components/RatingStars'
import { ProductReviews } from '../components/ProductReviews'
import type { Product } from '../types/product'
import './Products.css'

export function ProductDetail() {
  const { id } = useParams<{ id: string }>()
  const { addItem } = useCart()
  const { t, tc } = useI18n()
  const navigate = useNavigate()
  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [added, setAdded] = useState(false)

  useEffect(() => {
    if (!id) return
    let active = true
    setLoading(true)
    fetchProduct(id)
      .then((p) => active && setProduct(p))
      .catch(() => active && setError('__NOT_FOUND__'))
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [id])

  if (loading) return <p className="muted">{t('লোড হচ্ছে…', 'Loading…')}</p>
  if (error || !product)
    return (
      <div className="card">
        <p className="muted">{t('পণ্যটি পাওয়া যায়নি', 'Product not found')}</p>
        <Link to="/products">← {t('পণ্যে ফিরে যান', 'Back to products')}</Link>
      </div>
    )

  return (
    <section className="card product-detail">
      <Link to="/products" className="product-detail__back">← {t('সব পণ্য', 'All products')}</Link>
      <div className="product-detail__layout">
        <div className="product-detail__image">
          {product.imageUrl ? (
            <img src={product.imageUrl} alt={tc(product.name, product.nameEnglish)} />
          ) : (
            <span className="product-card__placeholder">🍽️</span>
          )}
        </div>
        <div className="product-detail__info">
          <h1>{tc(product.name, product.nameEnglish)}</h1>
          {product.categoryName && <span className="product-card__cat">{product.categoryName}</span>}
          {product.reviewCount > 0 && (
            <div className="product-detail__rating">
              <RatingStars rating={product.avgRating} count={product.reviewCount} />
            </div>
          )}
          <p className="product-detail__price">
            {product.salePrice != null && product.salePrice < product.price ? (
              <>
                {formatBdt(product.salePrice)}{' '}
                <s className="product-card__was">{formatBdt(product.price)}</s>
              </>
            ) : (
              formatBdt(product.price)
            )}
          </p>
          {product.description && <p>{product.description}</p>}
          {product.prepInfo && <p className="muted">{t('প্রস্তুতি:', 'Prep:')} {product.prepInfo}</p>}
          {product.isAvailable ? (
            <div className="product-detail__actions">
              <button
                className="product-detail__order product-detail__order--active"
                onClick={() => {
                  addItem(product)
                  setAdded(true)
                }}
              >
                {t('কার্টে যোগ করুন', 'Add to cart')}
              </button>
              {added && (
                <button className="btn-ghost" onClick={() => navigate('/cart')}>
                  {t('কার্টে যান', 'Go to cart')} →
                </button>
              )}
            </div>
          ) : (
            <p className="product-detail__soldout">{t('এই মুহূর্তে সোল্ড আউট', 'Currently sold out')}</p>
          )}
        </div>
      </div>

      <ProductReviews productId={product.id} />
    </section>
  )
}

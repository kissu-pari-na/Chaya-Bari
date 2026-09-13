import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { fetchProduct } from '../lib/products'
import { formatBdt } from '../lib/format'
import { useCart } from '../context/CartContext'
import { RatingStars } from '../components/RatingStars'
import { ProductReviews } from '../components/ProductReviews'
import type { Product } from '../types/product'
import './Products.css'

export function ProductDetail() {
  const { id } = useParams<{ id: string }>()
  const { addItem } = useCart()
  const navigate = useNavigate()
  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [added, setAdded] = useState(false)

  const loadProduct = useCallback(() => {
    if (!id) return Promise.resolve()
    return fetchProduct(id)
      .then((p) => setProduct(p))
      .catch(() => setError('পণ্যটি পাওয়া যায়নি'))
  }, [id])

  useEffect(() => {
    if (!id) return
    let active = true
    setLoading(true)
    fetchProduct(id)
      .then((p) => active && setProduct(p))
      .catch(() => active && setError('পণ্যটি পাওয়া যায়নি'))
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [id])

  if (loading) return <p className="muted">লোড হচ্ছে…</p>
  if (error || !product)
    return (
      <div className="card">
        <p className="muted">{error ?? 'পণ্যটি পাওয়া যায়নি'}</p>
        <Link to="/products">← পণ্যে ফিরে যান</Link>
      </div>
    )

  return (
    <section className="card product-detail">
      <Link to="/products" className="product-detail__back">← সব পণ্য</Link>
      <div className="product-detail__layout">
        <div className="product-detail__image">
          {product.imageUrl ? (
            <img src={product.imageUrl} alt={product.name} />
          ) : (
            <span className="product-card__placeholder">🍽️</span>
          )}
        </div>
        <div className="product-detail__info">
          <h1>{product.name}</h1>
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
          {product.prepInfo && <p className="muted">প্রস্তুতি: {product.prepInfo}</p>}
          {product.isAvailable ? (
            <div className="product-detail__actions">
              <button
                className="product-detail__order product-detail__order--active"
                onClick={() => {
                  addItem(product)
                  setAdded(true)
                }}
              >
                কার্টে যোগ করুন
              </button>
              {added && (
                <button className="btn-ghost" onClick={() => navigate('/cart')}>
                  কার্টে যান →
                </button>
              )}
            </div>
          ) : (
            <p className="product-detail__soldout">এই মুহূর্তে সোল্ড আউট</p>
          )}
        </div>
      </div>

      <ProductReviews productId={product.id} onRatingChanged={loadProduct} />
    </section>
  )
}

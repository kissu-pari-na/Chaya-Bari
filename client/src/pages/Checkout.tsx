import { useEffect, useMemo, useState, type SyntheticEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useCart } from '../context/CartContext'
import { fetchAddresses, fetchOrderingWindow, placeOrder, previewCoupon } from '../lib/orders'
import { ApiError } from '../lib/apiClient'
import { formatBdt } from '../lib/format'
import type { Address, AddressInput, CouponPreview, OrderingWindow } from '../types/order'
import './Checkout.css'

const emptyAddress: AddressInput = {
  recipientName: '',
  recipientPhone: '',
  addressLine: '',
  area: '',
  city: 'Dhaka',
  note: '',
}

export function Checkout() {
  const { items, subtotal, clear } = useCart()
  const navigate = useNavigate()

  const [addresses, setAddresses] = useState<Address[]>([])
  const [window, setWindow] = useState<OrderingWindow | null>(null)
  const [selectedAddressId, setSelectedAddressId] = useState<string>('')
  const [useNew, setUseNew] = useState(false)
  const [newAddress, setNewAddress] = useState<AddressInput>(emptyAddress)
  const [saveAddress, setSaveAddress] = useState(true)
  const [fulfillmentDate, setFulfillmentDate] = useState('')
  const [notes, setNotes] = useState('')
  const [couponCode, setCouponCode] = useState('')
  const [coupon, setCoupon] = useState<CouponPreview | null>(null)
  const [couponError, setCouponError] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    fetchOrderingWindow()
      .then((w) => {
        setWindow(w)
        setFulfillmentDate(w.earliestFulfillmentDate)
      })
      .catch(() => setError('অর্ডার তথ্য লোড করা যায়নি'))
    fetchAddresses()
      .then((a) => {
        setAddresses(a)
        const def = a.find((x) => x.isDefault) ?? a[0]
        if (def) setSelectedAddressId(def.id)
        else setUseNew(true)
      })
      .catch(() => setUseNew(true))
  }, [])

  const deliveryCost = window?.defaultDeliveryCost ?? 0
  // With a valid coupon, trust the server-computed pricing (gross subtotal +
  // itemised discounts). Without one, the cart subtotal already reflects any
  // per-item sale prices, so show it directly with no separate discount line.
  const displaySubtotal = coupon?.pricing.subtotal ?? subtotal
  const productDiscount = coupon?.pricing.productDiscount ?? 0
  const deliveryDiscount = coupon?.pricing.deliveryDiscount ?? 0
  const total = useMemo(
    () => (coupon ? coupon.pricing.total : subtotal + deliveryCost),
    [coupon, subtotal, deliveryCost],
  )

  async function handleApplyCoupon() {
    setCouponError(null)
    if (!couponCode.trim()) return
    try {
      const preview = await previewCoupon(
        couponCode.trim(),
        items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
      )
      setCoupon(preview)
    } catch (err) {
      setCoupon(null)
      setCouponError(err instanceof ApiError ? err.message : 'কুপন প্রয়োগ করা যায়নি')
    }
  }

  function clearCoupon() {
    setCoupon(null)
    setCouponCode('')
    setCouponError(null)
  }

  if (items.length === 0) {
    return (
      <section className="card">
        <h1>চেকআউট</h1>
        <p className="muted">কার্ট খালি।</p>
        <Link to="/products">পণ্য দেখুন →</Link>
      </section>
    )
  }

  async function handleSubmit(event: SyntheticEvent) {
    event.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      const order = await placeOrder({
        items: items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
        addressId: useNew ? undefined : selectedAddressId || undefined,
        address: useNew ? { ...newAddress, isDefault: saveAddress && addresses.length === 0 } : undefined,
        fulfillmentDate,
        notes: notes || undefined,
        couponCode: coupon ? coupon.coupon.code : undefined,
      })
      clear()
      navigate(`/orders/${order.id}`, { state: { justPlaced: true } })
    } catch (err) {
      if (err instanceof ApiError && err.details?.length) {
        setError(err.details.map((d) => d.message).join(' · '))
      } else {
        setError(err instanceof ApiError ? err.message : 'অর্ডার সম্পন্ন করা যায়নি')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="checkout">
      <form className="card checkout__main" onSubmit={handleSubmit}>
        <h1>চেকআউট</h1>
        {error && <div className="auth-error">{error}</div>}

        <fieldset>
          <legend>ডেলিভারি ঠিকানা</legend>
          {addresses.length > 0 && (
            <div className="address-options">
              {addresses.map((a) => (
                <label key={a.id} className={selectedAddressId === a.id && !useNew ? 'address-opt address-opt--on' : 'address-opt'}>
                  <input
                    type="radio"
                    name="address"
                    checked={selectedAddressId === a.id && !useNew}
                    onChange={() => {
                      setUseNew(false)
                      setSelectedAddressId(a.id)
                    }}
                  />
                  <span>
                    <strong>{a.recipientName}</strong> · {a.recipientPhone}
                    <br />
                    {a.addressLine}{a.area ? `, ${a.area}` : ''}, {a.city}
                  </span>
                </label>
              ))}
              <label className={useNew ? 'address-opt address-opt--on' : 'address-opt'}>
                <input type="radio" name="address" checked={useNew} onChange={() => setUseNew(true)} />
                <span>নতুন ঠিকানা যোগ করুন</span>
              </label>
            </div>
          )}

          {(useNew || addresses.length === 0) && (
            <div className="address-form">
              <div className="admin-form__row">
                <label>
                  প্রাপকের নাম
                  <input
                    value={newAddress.recipientName}
                    onChange={(e) => setNewAddress({ ...newAddress, recipientName: e.target.value })}
                    required
                  />
                </label>
                <label>
                  ফোন
                  <input
                    value={newAddress.recipientPhone}
                    onChange={(e) => setNewAddress({ ...newAddress, recipientPhone: e.target.value })}
                    required
                  />
                </label>
              </div>
              <label>
                ঠিকানা
                <input
                  value={newAddress.addressLine}
                  onChange={(e) => setNewAddress({ ...newAddress, addressLine: e.target.value })}
                  required
                />
              </label>
              <div className="admin-form__row">
                <label>
                  এলাকা
                  <input value={newAddress.area} onChange={(e) => setNewAddress({ ...newAddress, area: e.target.value })} />
                </label>
                <label>
                  শহর
                  <input
                    value={newAddress.city}
                    onChange={(e) => setNewAddress({ ...newAddress, city: e.target.value })}
                    required
                  />
                </label>
              </div>
              {addresses.length > 0 && (
                <label className="admin-form__check">
                  <input type="checkbox" checked={saveAddress} onChange={(e) => setSaveAddress(e.target.checked)} />
                  এই ঠিকানা সংরক্ষণ করুন
                </label>
              )}
            </div>
          )}
        </fieldset>

        <fieldset>
          <legend>ডেলিভারির তারিখ</legend>
          <label>
            তারিখ নির্বাচন করুন
            <input
              type="date"
              value={fulfillmentDate}
              min={window?.earliestFulfillmentDate}
              onChange={(e) => setFulfillmentDate(e.target.value)}
              required
            />
          </label>
          {window && (
            <p className="hint">
              অগ্রিম অর্ডার: সর্বনিম্ন {window.earliestFulfillmentDate} তারিখের জন্য (কাটঅফ {window.cutoffTime})।
            </p>
          )}
        </fieldset>

        <fieldset>
          <legend>নোট (ঐচ্ছিক)</legend>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} maxLength={1000} />
        </fieldset>
      </form>

      <aside className="card checkout__summary">
        <h2>অর্ডার সারাংশ</h2>
        <ul>
          {items.map((i) => (
            <li key={i.productId}>
              <span>
                {i.name} × {i.quantity}
              </span>
              <span>{formatBdt(i.price * i.quantity)}</span>
            </li>
          ))}
        </ul>
        <div className="coupon-box">
          {coupon ? (
            <div className="coupon-applied">
              <span>✓ কুপন <strong>{coupon.coupon.code}</strong> প্রয়োগ হয়েছে</span>
              <button type="button" onClick={clearCoupon}>সরান</button>
            </div>
          ) : (
            <div className="coupon-input">
              <input
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value)}
                placeholder="কুপন কোড"
              />
              <button type="button" onClick={handleApplyCoupon}>প্রয়োগ</button>
            </div>
          )}
          {couponError && <p className="hint hint--err">{couponError}</p>}
        </div>

        <div className="checkout__line">
          <span>সাবটোটাল</span>
          <span>{formatBdt(displaySubtotal)}</span>
        </div>
        {productDiscount > 0 && (
          <div className="checkout__line checkout__line--discount">
            <span>ফুড ডিসকাউন্ট</span>
            <span>−{formatBdt(productDiscount)}</span>
          </div>
        )}
        <div className="checkout__line">
          <span>ডেলিভারি চার্জ</span>
          <span>{formatBdt(deliveryCost)}</span>
        </div>
        {deliveryDiscount > 0 && (
          <div className="checkout__line checkout__line--discount">
            <span>ডেলিভারি ডিসকাউন্ট</span>
            <span>−{formatBdt(deliveryDiscount)}</span>
          </div>
        )}
        <div className="checkout__line checkout__line--total">
          <span>সর্বমোট</span>
          <span>{formatBdt(total)}</span>
        </div>
        <button type="button" onClick={handleSubmit} disabled={submitting} className="checkout__place">
          {submitting ? 'অর্ডার হচ্ছে…' : 'অর্ডার নিশ্চিত করুন'}
        </button>
        <p className="hint">পেমেন্ট পরবর্তী ধাপে যুক্ত হবে; আপাতত অর্ডার রেকর্ড হবে।</p>
      </aside>
    </section>
  )
}

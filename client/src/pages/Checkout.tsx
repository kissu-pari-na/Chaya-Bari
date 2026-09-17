import { useEffect, useMemo, useRef, useState, type SyntheticEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useCart } from '../context/CartContext'
import { useI18n } from '../context/LanguageContext'
import { fetchAddresses, fetchOrderingWindow, placeOrder, previewCoupon } from '../lib/orders'
import { ApiError } from '../lib/apiClient'
import { formatBdt } from '../lib/format'
import { TIME_SLOTS, formatSlotLabel, isSlotEnabledForDate, isWeekend, pickDefaultSlot } from '../lib/slots'
import type { Address, CouponPreview, OrderingWindow } from '../types/order'
import './Checkout.css'

// Orbitax staff get the free-delivery coupon auto-applied when it is valid.
const ORBITAX_COUPON = 'ORBIFREEDEL'
function isOrbitaxEmail(email: string): boolean {
  const domain = email.trim().toLowerCase().split('@')[1] ?? ''
  return domain === 'orbitax.com' || domain.endsWith('.orbitax.com')
}

export function Checkout() {
  const { items, subtotal, clear } = useCart()
  const { user } = useAuth()
  const { t } = useI18n()
  const navigate = useNavigate()

  const [addresses, setAddresses] = useState<Address[]>([])
  const [addressesLoaded, setAddressesLoaded] = useState(false)
  const [window, setWindow] = useState<OrderingWindow | null>(null)
  const [selectedAddressId, setSelectedAddressId] = useState<string>('')
  const [fulfillmentDate, setFulfillmentDate] = useState('')
  const [timeSlot, setTimeSlot] = useState('')
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
      .catch(() => setError(t('অর্ডার তথ্য লোড করা যায়নি', 'Could not load ordering info')))
    fetchAddresses()
      .then((a) => {
        setAddresses(a)
        // Pre-select the default address (or the first one) so checkout is filled
        // in from the profile without any extra taps.
        const def = a.find((x) => x.isDefault) ?? a[0]
        if (def) setSelectedAddressId(def.id)
      })
      .catch(() => setError(t('ঠিকানা লোড করা যায়নি', 'Could not load addresses')))
      .finally(() => setAddressesLoaded(true))
  }, [])

  // Auto-select the closest available time slot whenever the delivery day
  // changes (a new day can open/close different slots).
  useEffect(() => {
    if (fulfillmentDate) setTimeSlot(pickDefaultSlot(fulfillmentDate))
  }, [fulfillmentDate])

  // Auto-apply the free-delivery coupon for Orbitax staff when it is currently
  // valid. Runs once; never overrides a coupon the user applied themselves, and
  // stays silent if the coupon does not apply.
  const autoCouponTried = useRef(false)
  useEffect(() => {
    if (autoCouponTried.current || !user || items.length === 0) return
    autoCouponTried.current = true
    if (!isOrbitaxEmail(user.email)) return
    previewCoupon(
      ORBITAX_COUPON,
      items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
    )
      .then((preview) => setCoupon((current) => current ?? preview))
      .catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, items])

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
      setCouponError(err instanceof ApiError ? err.message : t('কুপন প্রয়োগ করা যায়নি', 'Could not apply coupon'))
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
        <h1>{t('চেকআউট', 'Checkout')}</h1>
        <p className="muted">{t('কার্ট খালি।', 'Your cart is empty.')}</p>
        <Link to="/products">{t('পণ্য দেখুন', 'Browse products')} →</Link>
      </section>
    )
  }

  async function handleSubmit(event: SyntheticEvent) {
    event.preventDefault()
    setError(null)
    if (!selectedAddressId) {
      setError(t('অর্ডার করার আগে একটি ডেলিভারি ঠিকানা নির্বাচন করুন', 'Please set a delivery address before ordering'))
      return
    }
    if (!timeSlot) {
      setError(t('একটি ডেলিভারি সময় স্লট নির্বাচন করুন', 'Please choose a delivery time slot'))
      return
    }
    setSubmitting(true)
    try {
      const order = await placeOrder({
        items: items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
        addressId: selectedAddressId,
        fulfillmentDate,
        timeSlot,
        notes: notes || undefined,
        couponCode: coupon ? coupon.coupon.code : undefined,
      })
      clear()
      navigate(`/orders/${order.id}`, { state: { justPlaced: true } })
    } catch (err) {
      if (err instanceof ApiError && err.details?.length) {
        setError(err.details.map((d) => d.message).join(' · '))
      } else {
        setError(err instanceof ApiError ? err.message : t('অর্ডার সম্পন্ন করা যায়নি', 'Could not place the order'))
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="checkout">
      <form className="card checkout__main" onSubmit={handleSubmit}>
        <h1>{t('চেকআউট', 'Checkout')}</h1>
        {error && <div className="auth-error">{error}</div>}

        <fieldset>
          <legend>{t('ডেলিভারি ঠিকানা', 'Delivery address')}</legend>
          {addresses.length > 0 ? (
            <>
              <div className="address-options">
                {addresses.map((a) => (
                  <label key={a.id} className={selectedAddressId === a.id ? 'address-opt address-opt--on' : 'address-opt'}>
                    <input
                      type="radio"
                      name="address"
                      checked={selectedAddressId === a.id}
                      onChange={() => setSelectedAddressId(a.id)}
                    />
                    <span>
                      <strong>{a.recipientName}</strong> · {a.recipientPhone}
                      {a.isDefault && <span className="address-opt__badge">{t('ডিফল্ট', 'Default')}</span>}
                      <br />
                      {a.addressLine}{a.area ? `, ${a.area}` : ''}, {a.city}
                    </span>
                  </label>
                ))}
              </div>
              <p className="hint">
                <Link to="/profile#addresses">{t('ঠিকানা পরিচালনা করুন', 'Manage addresses')} →</Link>
              </p>
            </>
          ) : (
            addressesLoaded && (
              <div className="address-empty">
                <p>
                  {t(
                    'অর্ডার করার আগে আপনার প্রোফাইলে একটি ডেলিভারি ঠিকানা যোগ করুন, তারপর এখানে ফিরে আসুন।',
                    'Please add a delivery address in your profile first, then come back here to order.',
                  )}
                </p>
                <Link to="/profile#addresses" className="btn btn--brand">
                  {t('ঠিকানা যোগ করুন', 'Add an address')}
                </Link>
              </div>
            )
          )}
        </fieldset>

        <fieldset>
          <legend>{t('ডেলিভারির তারিখ', 'Delivery date')}</legend>
          <label>
            {t('তারিখ নির্বাচন করুন', 'Choose a date')}
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
              {t(
                `অগ্রিম অর্ডার: সর্বনিম্ন ${window.earliestFulfillmentDate} তারিখের জন্য (কাটঅফ ${window.cutoffTime})।`,
                `Pre-order: earliest for ${window.earliestFulfillmentDate} (cutoff ${window.cutoffTime}).`,
              )}
            </p>
          )}
        </fieldset>

        <fieldset>
          <legend>{t('ডেলিভারির সময়', 'Delivery time slot')}</legend>
          <div className="slot-grid">
            {TIME_SLOTS.map((s) => {
              const enabled = fulfillmentDate ? isSlotEnabledForDate(fulfillmentDate, s.value) : false
              const selected = timeSlot === s.value
              return (
                <button
                  key={s.value}
                  type="button"
                  className={selected ? 'slot slot--on' : 'slot'}
                  disabled={!enabled}
                  aria-pressed={selected}
                  onClick={() => setTimeSlot(s.value)}
                >
                  {formatSlotLabel(s)}
                </button>
              )
            })}
          </div>
          {fulfillmentDate && !isWeekend(fulfillmentDate) && (
            <p className="hint">
              {t(
                'সপ্তাহের দিনে (রবি–বৃহস্পতি) শুধু দুপুর ১২টা–২টা স্লট পাওয়া যায়।',
                'On weekdays (Sun–Thu) only the 12pm–2pm slot is available.',
              )}
            </p>
          )}
        </fieldset>

        <fieldset>
          <legend>{t('নোট (ঐচ্ছিক)', 'Note (optional)')}</legend>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} maxLength={1000} />
        </fieldset>
      </form>

      <aside className="card checkout__summary">
        <h2>{t('অর্ডার সারাংশ', 'Order summary')}</h2>
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
              <span>✓ {t('কুপন', 'Coupon')} <strong>{coupon.coupon.code}</strong> {t('প্রয়োগ হয়েছে', 'applied')}</span>
              <button type="button" onClick={clearCoupon}>{t('সরান', 'Remove')}</button>
            </div>
          ) : (
            <div className="coupon-input">
              <input
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value)}
                placeholder={t('কুপন কোড', 'Coupon code')}
              />
              <button type="button" onClick={handleApplyCoupon}>{t('প্রয়োগ', 'Apply')}</button>
            </div>
          )}
          {couponError && <p className="hint hint--err">{couponError}</p>}
        </div>

        <div className="checkout__line">
          <span>{t('সাবটোটাল', 'Subtotal')}</span>
          <span>{formatBdt(displaySubtotal)}</span>
        </div>
        {productDiscount > 0 && (
          <div className="checkout__line checkout__line--discount">
            <span>{t('ফুড ডিসকাউন্ট', 'Food discount')}</span>
            <span>−{formatBdt(productDiscount)}</span>
          </div>
        )}
        <div className="checkout__line">
          <span>{t('ডেলিভারি চার্জ', 'Delivery charge')}</span>
          <span>{formatBdt(deliveryCost)}</span>
        </div>
        {deliveryDiscount > 0 && (
          <div className="checkout__line checkout__line--discount">
            <span>{t('ডেলিভারি ডিসকাউন্ট', 'Delivery discount')}</span>
            <span>−{formatBdt(deliveryDiscount)}</span>
          </div>
        )}
        <div className="checkout__line checkout__line--total">
          <span>{t('সর্বমোট', 'Grand total')}</span>
          <span>{formatBdt(total)}</span>
        </div>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting || !selectedAddressId}
          className="checkout__place"
        >
          {submitting ? t('অর্ডার হচ্ছে…', 'Placing order…') : t('অর্ডার নিশ্চিত করুন', 'Confirm order')}
        </button>
        {addressesLoaded && !selectedAddressId && (
          <p className="hint">{t('অর্ডার করতে একটি ঠিকানা যোগ করুন।', 'Add an address to place your order.')}</p>
        )}
        <p className="hint">{t('পেমেন্ট পরবর্তী ধাপে যুক্ত হবে; আপাতত অর্ডার রেকর্ড হবে।', 'Payment is added in a later step; for now the order is recorded.')}</p>
      </aside>
    </section>
  )
}

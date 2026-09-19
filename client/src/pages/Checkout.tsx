import { useEffect, useMemo, useRef, useState, type SyntheticEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useCart } from '../context/CartContext'
import { useI18n } from '../context/LanguageContext'
import { fetchAddresses, fetchOrderingWindow, placeGuestOrder, placeOrder, previewCoupon } from '../lib/orders'
import { fetchPaymentInfo } from '../lib/payments'
import { isOrbitaxEmail } from '../lib/orbitax'
import { ApiError } from '../lib/apiClient'
import { formatBdt, formatDateWithDay } from '../lib/format'
import { TIME_SLOTS, formatSlotLabel, isSlotEnabledForDate, isWeekend, pickDefaultSlot } from '../lib/slots'
import type { Address, CouponPreview, Order, OrderingWindow } from '../types/order'
import type { PaymentInfo } from '../types/payment'
import './Checkout.css'

// Orbitax staff get the free-delivery coupon auto-applied when it is valid.
const ORBITAX_COUPON = 'ORBIFREEDEL'

export function Checkout() {
  const { items, subtotal, clear } = useCart()
  const { user, updateProfile } = useAuth()
  const { t } = useI18n()
  const navigate = useNavigate()

  const isGuest = !user

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
  const [paymentMode, setPaymentMode] = useState<'PREPAID' | 'COD'>('PREPAID')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Account phone capture: shown when a signed-in customer has no phone on file.
  const [contactPhone, setContactPhone] = useState('')

  // Guest contact + delivery details (no account).
  const [guest, setGuest] = useState({
    recipientName: '',
    recipientPhone: '',
    email: '',
    addressLine: '',
    area: '',
    city: '',
    note: '',
  })
  const [placedGuest, setPlacedGuest] = useState<Order | null>(null)
  const [payInfo, setPayInfo] = useState<PaymentInfo | null>(null)

  useEffect(() => {
    fetchOrderingWindow()
      .then((w) => {
        setWindow(w)
        setFulfillmentDate(w.earliestFulfillmentDate)
      })
      .catch(() => setError(t('অর্ডার তথ্য লোড করা যায়নি', 'Could not load ordering info')))
    if (user) {
      fetchAddresses()
        .then((a) => {
          setAddresses(a)
          // Pre-select the default address (or the first one) so checkout is
          // filled in from the profile without any extra taps.
          const def = a.find((x) => x.isDefault) ?? a[0]
          if (def) setSelectedAddressId(def.id)
        })
        .catch(() => setError(t('ঠিকানা লোড করা যায়নি', 'Could not load addresses')))
        .finally(() => setAddressesLoaded(true))
    } else {
      setAddressesLoaded(true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Payment-account details (public) — shown to a guest who chooses to pay in
  // advance, on the confirmation screen.
  useEffect(() => {
    fetchPaymentInfo()
      .then(setPayInfo)
      .catch(() => setPayInfo(null))
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

  if (items.length === 0 && !placedGuest) {
    return (
      <section className="card">
        <h1>{t('চেকআউট', 'Checkout')}</h1>
        <p className="muted">{t('কার্ট খালি।', 'Your cart is empty.')}</p>
        <Link to="/products">{t('পণ্য দেখুন', 'Browse products')} →</Link>
      </section>
    )
  }

  // Guest order confirmation (guests can't open /orders/:id without an account).
  if (placedGuest) {
    return (
      <section className="card checkout__placed">
        <div className="order-placed">✓ {t('আপনার অর্ডার সফলভাবে গ্রহণ করা হয়েছে!', 'Your order was placed successfully!')}</div>
        <h1>{t('ধন্যবাদ!', 'Thank you!')}</h1>
        <p>
          {t('আপনার অর্ডার নম্বর:', 'Your order number:')} <strong>{placedGuest.orderNumber}</strong>
        </p>
        {placedGuest.paymentMode === 'COD' ? (
          <p className="muted">
            {t(
              'এটি ক্যাশ অন ডেলিভারি অর্ডার — ডেলিভারির সময় নগদে পরিশোধ করবেন। আমরা শীঘ্রই আপনার সাথে যোগাযোগ করব।',
              'This is a cash-on-delivery order — please pay in cash when it arrives. We will contact you shortly to confirm.',
            )}
          </p>
        ) : (
          <div className="checkout__pay-instructions">
            <p>
              {t(
                `অগ্রিম পেমেন্ট: অনুগ্রহ করে ৳${placedGuest.total} নিচের যেকোনো একটিতে পাঠান এবং রেফারেন্সে অর্ডার নম্বর ${placedGuest.orderNumber} দিন। আমরা যাচাই করে নিশ্চিত করব।`,
                `Pay in advance: please send ৳${placedGuest.total} to one of the accounts below and use order number ${placedGuest.orderNumber} as the reference. We will verify and confirm.`,
              )}
            </p>
            {payInfo && (payInfo.bkash || payInfo.nagad || payInfo.rocket || payInfo.bankInfo) && (
              <div className="pay-accounts">
                {payInfo.bkash && <span>{t('বিকাশ:', 'bKash:')} <strong>{payInfo.bkash}</strong></span>}
                {payInfo.nagad && <span>{t('নগদ:', 'Nagad:')} <strong>{payInfo.nagad}</strong></span>}
                {payInfo.rocket && <span>{t('রকেট:', 'Rocket:')} <strong>{payInfo.rocket}</strong></span>}
                {payInfo.bankInfo && <span>{payInfo.bankInfo}</span>}
              </div>
            )}
          </div>
        )}
        <div className="checkout__register-cta">
          <h2>{t('একটি অ্যাকাউন্ট তৈরি করুন', 'Create an account')}</h2>
          <p>
            {t(
              'রেজিস্টার করলে আপনি অর্ডার ট্র্যাক করতে, অর্ডার হিস্টরি দেখতে, দ্রুত চেকআউট করতে এবং রিভিউ দিতে পারবেন।',
              'Register to track this and future orders, see your order history, check out faster, and leave reviews.',
            )}
          </p>
          <Link to="/register" className="btn btn--brand">{t('রেজিস্টার করুন', 'Create account')}</Link>
        </div>
        <Link to="/products">← {t('আরও কিছু অর্ডার করুন', 'Order something else')}</Link>
      </section>
    )
  }

  async function handleSubmit(event: SyntheticEvent) {
    event.preventDefault()
    setError(null)

    if (!timeSlot) {
      setError(t('একটি ডেলিভারি সময় স্লট নির্বাচন করুন', 'Please choose a delivery time slot'))
      return
    }

    if (isGuest) {
      if (!guest.recipientName.trim() || !guest.recipientPhone.trim() || !guest.addressLine.trim() || !guest.city.trim()) {
        setError(t('অনুগ্রহ করে নাম, ফোন, ঠিকানা ও শহর দিন', 'Please provide your name, phone, address and city'))
        return
      }
      setSubmitting(true)
      try {
        await placeGuestOrder({
          items: items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
          address: {
            recipientName: guest.recipientName.trim(),
            recipientPhone: guest.recipientPhone.trim(),
            addressLine: guest.addressLine.trim(),
            area: guest.area.trim() || undefined,
            city: guest.city.trim(),
            note: guest.note.trim() || undefined,
          },
          guestEmail: guest.email.trim() || undefined,
          fulfillmentDate,
          timeSlot,
          notes: notes || undefined,
          couponCode: coupon ? coupon.coupon.code : undefined,
          paymentMode,
        }).then((order) => {
          clear()
          setPlacedGuest(order)
        })
      } catch (err) {
        if (err instanceof ApiError && err.details?.length) setError(err.details.map((d) => d.message).join(' · '))
        else setError(err instanceof ApiError ? err.message : t('অর্ডার সম্পন্ন করা যায়নি', 'Could not place the order'))
      } finally {
        setSubmitting(false)
      }
      return
    }

    // Signed-in customer.
    if (!selectedAddressId) {
      setError(t('অর্ডার করার আগে একটি ডেলিভারি ঠিকানা নির্বাচন করুন', 'Please set a delivery address before ordering'))
      return
    }
    const needsPhone = !user?.phone
    if (needsPhone && !contactPhone.trim()) {
      setError(t('অনুগ্রহ করে আপনার মোবাইল নম্বর দিন', 'Please add your mobile number'))
      return
    }
    setSubmitting(true)
    try {
      // Capture the account phone number if it was missing (feature: collect it
      // while ordering). A clash surfaces as an error so the order isn't placed
      // with a number we couldn't save.
      if (needsPhone && contactPhone.trim()) {
        await updateProfile({ phone: contactPhone.trim() })
      }
      const order = await placeOrder({
        items: items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
        addressId: selectedAddressId,
        fulfillmentDate,
        timeSlot,
        notes: notes || undefined,
        couponCode: coupon ? coupon.coupon.code : undefined,
        paymentMode,
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

        {isGuest && (
          <div className="checkout__guest-banner">
            <strong>{t('অতিথি হিসেবে অর্ডার করছেন', 'Ordering as a guest')}</strong>
            <p>
              {t(
                'অ্যাকাউন্ট থাকলে অর্ডার ট্র্যাকিং, অর্ডার হিস্টরি, দ্রুত চেকআউট ও রিভিউ সুবিধা পাবেন।',
                'With an account you get order tracking, order history, faster checkout and reviews.',
              )}
            </p>
            <p className="checkout__guest-links">
              <Link to="/register">{t('রেজিস্টার করুন', 'Create an account')}</Link>
              {' · '}
              <Link to="/login" state={{ from: { pathname: '/checkout' } }}>{t('লগইন', 'Log in')}</Link>
            </p>
          </div>
        )}

        {isGuest ? (
          <fieldset>
            <legend>{t('যোগাযোগ ও ডেলিভারি ঠিকানা', 'Contact & delivery address')}</legend>
            <div className="guest-grid">
              <label>
                {t('নাম', 'Name')}
                <input value={guest.recipientName} onChange={(e) => setGuest({ ...guest, recipientName: e.target.value })} maxLength={100} required />
              </label>
              <label>
                {t('মোবাইল নম্বর', 'Mobile number')}
                <input value={guest.recipientPhone} onChange={(e) => setGuest({ ...guest, recipientPhone: e.target.value })} maxLength={20} inputMode="tel" required />
              </label>
              <label className="guest-grid__full">
                {t('ইমেইল (ঐচ্ছিক)', 'Email (optional)')}
                <input type="email" value={guest.email} onChange={(e) => setGuest({ ...guest, email: e.target.value })} maxLength={200} />
              </label>
              <label className="guest-grid__full">
                {t('ঠিকানা', 'Address')}
                <input value={guest.addressLine} onChange={(e) => setGuest({ ...guest, addressLine: e.target.value })} maxLength={300} required />
              </label>
              <label>
                {t('এলাকা (ঐচ্ছিক)', 'Area (optional)')}
                <input value={guest.area} onChange={(e) => setGuest({ ...guest, area: e.target.value })} maxLength={120} />
              </label>
              <label>
                {t('শহর', 'City')}
                <input value={guest.city} onChange={(e) => setGuest({ ...guest, city: e.target.value })} maxLength={120} required />
              </label>
              <label className="guest-grid__full">
                {t('ঠিকানা নোট (ঐচ্ছিক)', 'Address note (optional)')}
                <input value={guest.note} onChange={(e) => setGuest({ ...guest, note: e.target.value })} maxLength={300} />
              </label>
            </div>
          </fieldset>
        ) : (
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
        )}

        {!isGuest && !user?.phone && (
          <fieldset>
            <legend>{t('মোবাইল নম্বর', 'Mobile number')}</legend>
            <label>
              {t('আপনার মোবাইল নম্বর', 'Your mobile number')}
              <input
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                placeholder={t('যেমন: 01XXXXXXXXX', 'e.g. 01XXXXXXXXX')}
                maxLength={20}
                inputMode="tel"
                required
              />
            </label>
            <p className="hint">
              {t('আপনার অ্যাকাউন্টে নম্বরটি নেই — ডেলিভারির জন্য এটি যোগ করা হবে।', "Your account has no number on file — we'll add this for delivery contact.")}
            </p>
          </fieldset>
        )}

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
          {fulfillmentDate && (
            <p className="checkout__chosen-date">📅 {formatDateWithDay(fulfillmentDate)}</p>
          )}
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
          <legend>{t('পেমেন্ট পদ্ধতি', 'Payment method')}</legend>
          <div className="pay-mode-options">
            <label className={paymentMode === 'PREPAID' ? 'pay-mode pay-mode--on' : 'pay-mode'}>
              <input
                type="radio"
                name="paymentMode"
                checked={paymentMode === 'PREPAID'}
                onChange={() => setPaymentMode('PREPAID')}
              />
              <span>
                <strong>{t('অগ্রিম পেমেন্ট', 'Pay in advance')}</strong>
                <br />
                {isGuest
                  ? t('বিকাশ/নগদ/ব্যাংকে পরিশোধ করুন; অর্ডারের পর নির্দেশনা দেখানো হবে।', 'Pay via bKash/Nagad/bank; instructions are shown after you order.')
                  : t('বিকাশ/নগদ/ব্যাংকে পরিশোধ করে অর্ডার নিশ্চিত করুন।', 'Pay via bKash/Nagad/bank to confirm your order.')}
              </span>
            </label>
            <label className={paymentMode === 'COD' ? 'pay-mode pay-mode--on' : 'pay-mode'}>
              <input
                type="radio"
                name="paymentMode"
                checked={paymentMode === 'COD'}
                onChange={() => setPaymentMode('COD')}
              />
              <span>
                <strong>{t('ক্যাশ অন ডেলিভারি', 'Cash on delivery')}</strong>
                <br />
                {t('ডেলিভারির সময় নগদে পরিশোধ করুন।', 'Pay in cash when your order is delivered.')}
              </span>
            </label>
          </div>
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
          disabled={submitting || (!isGuest && !selectedAddressId)}
          className="checkout__place"
        >
          {submitting ? t('অর্ডার হচ্ছে…', 'Placing order…') : t('অর্ডার নিশ্চিত করুন', 'Confirm order')}
        </button>
        {!isGuest && addressesLoaded && !selectedAddressId && (
          <p className="hint">{t('অর্ডার করতে একটি ঠিকানা যোগ করুন।', 'Add an address to place your order.')}</p>
        )}
        <p className="hint">
          {paymentMode === 'COD'
            ? t('ক্যাশ অন ডেলিভারি: ডেলিভারির সময় নগদে পরিশোধ করবেন।', 'Cash on delivery: you will pay in cash when the order arrives.')
            : isGuest
              ? t('অগ্রিম পেমেন্ট: অর্ডারের পর পরিশোধের নির্দেশনা দেখানো হবে।', 'Pay in advance: payment instructions are shown after you order.')
              : t('অর্ডারের পর পেমেন্টের ধাপে বিকাশ/নগদ/ব্যাংকে পরিশোধ করে জানাতে পারবেন।', 'After ordering, you can pay via bKash/Nagad/bank and report it on the payment step.')}
        </p>
      </aside>
    </section>
  )
}

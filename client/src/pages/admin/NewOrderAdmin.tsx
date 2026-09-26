import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { fetchOrderingWindow, lookupCustomer, placeAdminOrder } from '../../lib/orders'
import { fetchAdminProducts } from '../../lib/products'
import { ApiError } from '../../lib/apiClient'
import { DELIVERY_ZONES, ORBITAX_OFFICE_AREA } from '../../lib/deliveryAreas'
import { isOrbitaxEmail } from '../../lib/orbitax'
import { TIME_SLOTS, formatSlotLabel, pickDefaultSlot } from '../../lib/slots'
import { formatBdt } from '../../lib/format'
import { useI18n } from '../../context/LanguageContext'
import { useContentLang } from '../../context/TranslationContext'
import type { CustomerLookup, OrderingWindow, PaymentMode } from '../../types/order'
import type { Product } from '../../types/product'
import './Admin.css'

interface Line {
  productId: string
  quantity: number
}

const NEW_ADDRESS = 'new'

const emptyAddress = { recipientName: '', recipientPhone: '', addressLine: '', area: '', note: '' }

/// Today's date (YYYY-MM-DD) in the business timezone.
function todayIn(timezone: string): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: timezone })
}

/// Admin places an order on a customer's behalf, identified by email. An email
/// with no account gets a placeholder account; when that person later registers
/// (or signs in with Google) with the same email, the order is already theirs.
export function NewOrderAdmin() {
  const { t } = useI18n()
  const { lc } = useContentLang()
  const navigate = useNavigate()

  const [products, setProducts] = useState<Product[]>([])
  const [orderingWindow, setOrderingWindow] = useState<OrderingWindow | null>(null)

  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [lookup, setLookup] = useState<CustomerLookup | null>(null)
  const [lookingUp, setLookingUp] = useState(false)

  const [addressId, setAddressId] = useState<string>(NEW_ADDRESS)
  const [address, setAddress] = useState(emptyAddress)
  const [saveAddress, setSaveAddress] = useState(true)

  const [lines, setLines] = useState<Line[]>([{ productId: '', quantity: 1 }])
  const [fulfillmentDate, setFulfillmentDate] = useState('')
  const [timeSlot, setTimeSlot] = useState('')
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('COD')
  const [couponCode, setCouponCode] = useState('')
  const [notes, setNotes] = useState('')

  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchAdminProducts()
      .then((ps) => setProducts(ps.filter((p) => p.isActive)))
      .catch(() => {})
    fetchOrderingWindow()
      .then((w) => {
        setOrderingWindow(w)
        setFulfillmentDate(w.earliestFulfillmentDate)
        setTimeSlot(pickDefaultSlot(w.earliestFulfillmentDate))
      })
      .catch(() => {})
  }, [])

  // The typed email changed: forget the previous lookup.
  function changeEmail(value: string) {
    setEmail(value)
    if (lookup && lookup.email !== value.trim().toLowerCase()) {
      setLookup(null)
      setAddressId(NEW_ADDRESS)
    }
  }

  async function runLookup() {
    const value = email.trim()
    if (!value.includes('@')) return
    setLookingUp(true)
    try {
      const found = await lookupCustomer(value)
      setLookup(found)
      if (found.name && !name) setName(found.name)
      const preferred = found.addresses.find((a) => a.isDefault) ?? found.addresses[0]
      setAddressId(preferred ? preferred.id : NEW_ADDRESS)
      if (found.phone && !address.recipientPhone) setAddress((a) => ({ ...a, recipientPhone: found.phone ?? '' }))
    } catch {
      setLookup(null)
    } finally {
      setLookingUp(false)
    }
  }

  // An admin ordering for a customer has no delivery-time restrictions: any day
  // from today (no advance-order cutoff) and every slot on every day.
  const minDate = orderingWindow ? todayIn(orderingWindow.timezone) : undefined

  const productById = useMemo(() => new Map(products.map((p) => [p.id, p])), [products])
  const subtotal = lines.reduce((sum, l) => {
    const p = productById.get(l.productId)
    return p ? sum + (p.salePrice ?? p.price) * l.quantity : sum
  }, 0)

  function updateLine(index: number, patch: Partial<Line>) {
    setLines((ls) => ls.map((l, i) => (i === index ? { ...l, ...patch } : l)))
  }

  const orbitax = isOrbitaxEmail(email)
  const usingNewAddress = addressId === NEW_ADDRESS

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    const items = lines.filter((l) => l.productId && l.quantity > 0)
    if (items.length === 0) {
      setError(t('অন্তত একটি পণ্য যোগ করুন', 'Add at least one item'))
      return
    }
    setSaving(true)
    try {
      const order = await placeAdminOrder({
        customer: { email: email.trim(), name: name.trim() },
        items,
        ...(usingNewAddress
          ? {
              address: {
                recipientName: address.recipientName.trim() || name.trim(),
                recipientPhone: address.recipientPhone.trim(),
                addressLine: address.addressLine,
                area: address.area || undefined,
                city: 'Dhaka',
                note: address.note || undefined,
              },
              saveAddress,
            }
          : { addressId }),
        fulfillmentDate,
        timeSlot,
        notes: notes || undefined,
        couponCode: couponCode || undefined,
        paymentMode,
      })
      navigate(`/admin/orders/${order.id}`)
    } catch (err) {
      if (err instanceof ApiError && err.details?.length) setError(err.details.map((d) => d.message).join(' · '))
      else setError(err instanceof ApiError ? err.message : t('অর্ডার করা যায়নি', 'Could not place the order'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <section>
      <p>
        <Link to="/admin/orders">← {t('অর্ডার', 'Orders')}</Link>
      </p>
      <h1>{t('গ্রাহকের পক্ষে অর্ডার', 'Order on behalf of a customer')}</h1>
      <p className="muted">
        {t(
          'গ্রাহকের ইমেইল দিয়ে অর্ডার করুন। অ্যাকাউন্ট না থাকলে ইমেইলটির জন্য একটি অ্যাকাউন্ট সংরক্ষিত থাকবে — গ্রাহক পরে একই ইমেইলে রেজিস্টার করলে সব অর্ডার নিজের অ্যাকাউন্টে পাবেন।',
          'Order using the customer’s email. If they have no account, one is reserved for that email — when they later sign up with it, every order placed for them is already in their account.',
        )}
      </p>

      <form className="admin-form" onSubmit={handleSubmit} style={{ maxWidth: 720 }}>
        {error && <div className="auth-error">{error}</div>}

        <h2>{t('গ্রাহক', 'Customer')}</h2>
        <div className="admin-form__row">
          <label>
            {t('ইমেইল', 'Email')}
            <input
              type="email"
              value={email}
              onChange={(e) => changeEmail(e.target.value)}
              onBlur={() => void runLookup()}
              required
              maxLength={160}
            />
          </label>
          <label>
            {t('নাম', 'Name')}
            <input value={name} onChange={(e) => setName(e.target.value)} required minLength={2} maxLength={150} />
          </label>
        </div>
        {lookingUp && <p className="hint">{t('খোঁজা হচ্ছে…', 'Looking up…')}</p>}
        {lookup && !lookingUp && (
          <p className={lookup.isStaff ? 'hint hint--warning' : 'hint'}>
            {lookup.isStaff
              ? t('এটি স্টাফ অ্যাকাউন্ট — এর পক্ষে অর্ডার করা যাবে না।', 'This is a staff account — it can’t be ordered for.')
              : lookup.isRegistered
                ? t(
                    `নিবন্ধিত গ্রাহক · আগের অর্ডার: ${lookup.orderCount}`,
                    `Registered customer · ${lookup.orderCount} previous order(s)`,
                  )
                : lookup.exists
                  ? t(
                      `এখনো নিবন্ধিত নয় · আগের অর্ডার: ${lookup.orderCount}। রেজিস্টার করলে সব অর্ডার পাবেন।`,
                      `Not registered yet · ${lookup.orderCount} previous order(s). They get them all when they sign up.`,
                    )
                  : t(
                      'নতুন গ্রাহক — এই ইমেইলের জন্য একটি অ্যাকাউন্ট সংরক্ষিত হবে।',
                      'New customer — an account will be reserved for this email.',
                    )}
          </p>
        )}

        <h2>{t('ডেলিভারি ঠিকানা', 'Delivery address')}</h2>
        {lookup && lookup.addresses.length > 0 && (
          <label>
            {t('ঠিকানা', 'Address')}
            <select value={addressId} onChange={(e) => setAddressId(e.target.value)}>
              {lookup.addresses.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.recipientName} · {a.recipientPhone} — {a.addressLine}
                  {a.area ? `, ${a.area}` : ''}
                </option>
              ))}
              <option value={NEW_ADDRESS}>{t('+ নতুন ঠিকানা', '+ New address')}</option>
            </select>
          </label>
        )}
        {usingNewAddress && (
          <>
            <div className="admin-form__row">
              <label>
                {t('প্রাপকের নাম', 'Recipient name')}
                <input
                  value={address.recipientName}
                  onChange={(e) => setAddress({ ...address, recipientName: e.target.value })}
                  placeholder={name}
                  maxLength={100}
                />
              </label>
              <label>
                {t('মোবাইল নম্বর', 'Mobile number')}
                <input
                  type="tel"
                  value={address.recipientPhone}
                  onChange={(e) => setAddress({ ...address, recipientPhone: e.target.value })}
                  required
                  minLength={6}
                  maxLength={20}
                />
              </label>
            </div>
            <label>
              {t('ঠিকানা', 'Address')}
              <input
                value={address.addressLine}
                onChange={(e) => setAddress({ ...address, addressLine: e.target.value })}
                required
                minLength={3}
                maxLength={300}
              />
            </label>
            <div className="admin-form__row">
              <label>
                {t('এলাকা', 'Area')}
                <select value={address.area} onChange={(e) => setAddress({ ...address, area: e.target.value })} required>
                  <option value="">{t('এলাকা নির্বাচন করুন', 'Select area')}</option>
                  {orbitax && <option value={ORBITAX_OFFICE_AREA}>{ORBITAX_OFFICE_AREA} (Orbitax)</option>}
                  {Object.entries(DELIVERY_ZONES).map(([zone, areas]) => (
                    <optgroup key={zone} label={zone}>
                      {areas.map((ar) => (
                        <option key={ar} value={ar}>
                          {ar}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </label>
              <label>
                {t('ঠিকানা নোট (ঐচ্ছিক)', 'Address note (optional)')}
                <input value={address.note} onChange={(e) => setAddress({ ...address, note: e.target.value })} maxLength={300} />
              </label>
            </div>
            <label className="admin-form__check">
              <input type="checkbox" checked={saveAddress} onChange={(e) => setSaveAddress(e.target.checked)} />
              {t('গ্রাহকের ঠিকানা বইয়ে সংরক্ষণ করুন', 'Save to the customer’s address book')}
            </label>
          </>
        )}

        <h2>{t('পণ্য', 'Items')}</h2>
        {lines.map((line, i) => (
          <div className="admin-form__row" key={i}>
            <label style={{ flex: 3 }}>
              {t('পণ্য', 'Product')}
              <select value={line.productId} onChange={(e) => updateLine(i, { productId: e.target.value })} required>
                <option value="">{t('পণ্য নির্বাচন করুন', 'Select product')}</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {lc(p.name, p.nameEnglish)} — {formatBdt(p.salePrice ?? p.price)}
                    {!p.isAvailable ? ` (${t('এখন অনুপলব্ধ', 'unavailable')})` : ''}
                  </option>
                ))}
              </select>
            </label>
            <label style={{ flex: 1, minWidth: 90 }}>
              {t('পরিমাণ', 'Qty')}
              <input
                type="number"
                min={1}
                max={1000}
                value={line.quantity}
                onChange={(e) => updateLine(i, { quantity: Number(e.target.value) })}
                required
              />
            </label>
            {lines.length > 1 && (
              <button
                type="button"
                className="btn-ghost"
                style={{ alignSelf: 'flex-end' }}
                onClick={() => setLines((ls) => ls.filter((_, j) => j !== i))}
              >
                {t('সরান', 'Remove')}
              </button>
            )}
          </div>
        ))}
        <div>
          <button type="button" className="btn-ghost" onClick={() => setLines((ls) => [...ls, { productId: '', quantity: 1 }])}>
            {t('+ পণ্য যোগ করুন', '+ Add item')}
          </button>
        </div>
        <p className="hint">
          {t('খাবার', 'Food')}: {formatBdt(subtotal)}
          {orderingWindow ? ` · ${t('ডেলিভারি', 'Delivery')}: ${formatBdt(orderingWindow.defaultDeliveryCost)}` : ''}
          {' · '}
          {t('কুপন ও সেল মূল্য অর্ডারে হিসাব হবে', 'Coupons and sale prices are applied when placed')}
        </p>

        <h2>{t('ডেলিভারি', 'Delivery')}</h2>
        <div className="admin-form__row">
          <label>
            {t('তারিখ', 'Date')}
            <input type="date" value={fulfillmentDate} min={minDate} onChange={(e) => setFulfillmentDate(e.target.value)} required />
          </label>
          <label>
            {t('সময়', 'Time slot')}
            <select value={timeSlot} onChange={(e) => setTimeSlot(e.target.value)} required>
              <option value="">{t('সময় নির্বাচন করুন', 'Select a slot')}</option>
              {TIME_SLOTS.map((s) => (
                <option key={s.value} value={s.value}>
                  {formatSlotLabel(s)}
                </option>
              ))}
            </select>
          </label>
        </div>
        <p className="hint">
          {t(
            'অ্যাডমিন অর্ডারে কোনো সময়সীমা নেই — আজ থেকে যেকোনো দিন ও যেকোনো সময় বেছে নিতে পারেন।',
            'No delivery-time limits for admin orders — pick any day from today and any time slot.',
          )}
        </p>

        <div className="admin-form__row">
          <label>
            {t('পেমেন্ট', 'Payment')}
            <select value={paymentMode} onChange={(e) => setPaymentMode(e.target.value as PaymentMode)}>
              <option value="COD">{t('ক্যাশ অন ডেলিভারি', 'Cash on delivery')}</option>
              <option value="PREPAID">{t('অগ্রিম পেমেন্ট', 'Pay in advance')}</option>
            </select>
          </label>
          <label>
            {t('কুপন (ঐচ্ছিক)', 'Coupon (optional)')}
            <input value={couponCode} onChange={(e) => setCouponCode(e.target.value)} maxLength={40} />
          </label>
        </div>
        <label>
          {t('নোট (ঐচ্ছিক)', 'Notes (optional)')}
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={1000} rows={3} />
        </label>

        <div className="admin-form__actions">
          <button type="submit" disabled={saving || lookup?.isStaff}>
            {saving ? t('অর্ডার হচ্ছে…', 'Placing…') : t('অর্ডার করুন', 'Place order')}
          </button>
        </div>
      </form>
    </section>
  )
}

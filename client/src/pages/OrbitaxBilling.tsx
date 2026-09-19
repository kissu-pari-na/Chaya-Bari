import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { fetchOrbitaxAccount, payOrbitax } from '../lib/orbitax'
import { formatBdt, formatDateWithDay } from '../lib/format'
import { orderStatusLabel, paymentStatusLabel } from '../lib/orderStatus'
import { paymentMethodLabel } from '../lib/paymentLabels'
import { ApiError } from '../lib/apiClient'
import { useI18n } from '../context/LanguageContext'
import type { OrbitaxAccount, OrbitaxPayMethod } from '../types/orbitax'
import './OrbitaxBilling.css'

// Methods an Orbitax user can settle with (mirrors the server's allowed set).
const PAY_METHODS: OrbitaxPayMethod[] = ['BKASH', 'NAGAD', 'ROCKET', 'BANK', 'CASH', 'ONLINE']

/// Self-service billing for Orbitax staff: shows the combined outstanding
/// balance across all their orders and lets them pay some or a specific amount,
/// allocated across the unpaid orders (oldest first) as claims admins verify.
export function OrbitaxBilling() {
  const { t } = useI18n()
  const [account, setAccount] = useState<OrbitaxAccount | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [method, setMethod] = useState<OrbitaxPayMethod>('BKASH')
  const [amount, setAmount] = useState('')
  const [reference, setReference] = useState('')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)

  useEffect(() => {
    fetchOrbitaxAccount()
      .then((a) => {
        setAccount(a)
        setAmount(a.totalDue > 0 ? String(a.totalDue) : '')
      })
      .catch((err) =>
        setLoadError(
          err instanceof ApiError ? err.message : t('তথ্য লোড করা যায়নি', 'Could not load your billing info'),
        ),
      )
      .finally(() => setLoading(false))
  }, [])

  const totalDue = account?.totalDue ?? 0

  function payFull() {
    setAmount(totalDue > 0 ? String(totalDue) : '')
  }

  const amountValid = useMemo(() => {
    const amt = Number(amount)
    return Number.isFinite(amt) && amt > 0 && amt <= totalDue
  }, [amount, totalDue])

  async function handlePay(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setMsg(null)
    const amt = Number(amount)
    if (!Number.isFinite(amt) || amt <= 0) {
      setError(t('পরিমাণ ০-এর বেশি হতে হবে।', 'Amount must be greater than 0.'))
      return
    }
    if (amt > totalDue) {
      setError(t('পরিমাণ মোট বকেয়ার বেশি হতে পারে না।', 'Amount cannot exceed your total outstanding balance.'))
      return
    }
    if (method !== 'CASH' && !reference.trim()) {
      setError(t('অনলাইন পেমেন্টের জন্য ট্রানজেকশন আইডি/রেফারেন্স দিন।', 'Provide a transaction ID/reference for online payments.'))
      return
    }
    setBusy(true)
    try {
      const result = await payOrbitax({
        method,
        amount: amt,
        reference: reference || undefined,
        note: note || undefined,
      })
      setAccount(result.account)
      setAmount(result.account.totalDue > 0 ? String(result.account.totalDue) : '')
      setReference('')
      setNote('')
      setMsg(
        t(
          `৳${amt} পেমেন্টের তথ্য ${result.claims.length}টি অর্ডারে জমা হয়েছে। যাচাইয়ের পর নিশ্চিত করা হবে।`,
          `Payment of ৳${amt} submitted across ${result.claims.length} order(s). It will be confirmed after verification.`,
        ),
      )
    } catch (err) {
      if (err instanceof ApiError && err.details?.length) setError(err.details.map((d) => d.message).join(' · '))
      else setError(err instanceof ApiError ? err.message : t('পেমেন্ট জমা দেওয়া যায়নি।', 'Could not submit the payment.'))
    } finally {
      setBusy(false)
    }
  }

  if (loading) return <p className="muted">{t('লোড হচ্ছে…', 'Loading…')}</p>

  if (loadError || !account) {
    return (
      <section className="card">
        <h1>{t('অরবিট্যাক্স বিলিং', 'Orbitax billing')}</h1>
        <p className="muted">{loadError ?? t('তথ্য পাওয়া যায়নি', 'Not available')}</p>
        <Link to="/">← {t('হোম', 'Home')}</Link>
      </section>
    )
  }

  return (
    <section className="orbitax">
      <div className="card orbitax__main">
        <h1>{t('অরবিট্যাক্স বিলিং', 'Orbitax billing')}</h1>
        <p className="muted">
          {t(
            'আপনার সব অর্ডারের মোট বকেয়া এখানে একসাথে পরিশোধ করতে পারেন।',
            'Settle the combined balance across all your orders here.',
          )}
        </p>

        <div className="orbitax__totals">
          <div className="orbitax__stat">
            <span className="orbitax__stat-label">{t('মোট বকেয়া', 'Total due')}</span>
            <span className={totalDue > 0 ? 'orbitax__stat-value orbitax__stat-value--due' : 'orbitax__stat-value orbitax__stat-value--ok'}>
              {formatBdt(totalDue)}
            </span>
          </div>
          <div className="orbitax__stat">
            <span className="orbitax__stat-label">{t('মোট পরিশোধিত', 'Total paid')}</span>
            <span className="orbitax__stat-value">{formatBdt(account.totalPaid)}</span>
          </div>
          <div className="orbitax__stat">
            <span className="orbitax__stat-label">{t('বকেয়া অর্ডার', 'Unpaid orders')}</span>
            <span className="orbitax__stat-value">{account.outstandingOrders}</span>
          </div>
        </div>

        {msg && <div className="pay-note pay-note--ok">{msg}</div>}
        {error && <div className="pay-note pay-note--err">{error}</div>}

        {totalDue > 0 ? (
          <form className="orbitax__pay" onSubmit={handlePay}>
            <h2>{t('পেমেন্ট করুন', 'Make a payment')}</h2>
            <div className="orbitax__pay-row">
              <label>
                {t('মাধ্যম', 'Method')}
                <select value={method} onChange={(e) => setMethod(e.target.value as OrbitaxPayMethod)}>
                  {PAY_METHODS.map((m) => (
                    <option key={m} value={m}>
                      {paymentMethodLabel[m]}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                {t('পরিমাণ (৳)', 'Amount (৳)')}
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  max={totalDue}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </label>
              <button type="button" className="orbitax__full-btn" onClick={payFull}>
                {t('পুরো বকেয়া', 'Pay full due')}
              </button>
            </div>
            <label>
              {t('ট্রানজেকশন আইডি / রেফারেন্স', 'Transaction ID / reference')} {method === 'CASH' ? t('(ঐচ্ছিক)', '(optional)') : ''}
              <input value={reference} onChange={(e) => setReference(e.target.value)} placeholder={t('যেমন: bKash TrxID', 'e.g. bKash TrxID')} />
            </label>
            <label>
              {t('নোট (ঐচ্ছিক)', 'Note (optional)')}
              <input value={note} onChange={(e) => setNote(e.target.value)} />
            </label>
            <button type="submit" className="orbitax__submit" disabled={busy || !amountValid}>
              {busy ? t('জমা হচ্ছে…', 'Submitting…') : t('পেমেন্টের তথ্য জমা দিন', 'Submit payment')}
            </button>
            <p className="hint">
              {t(
                'পরিমাণটি পুরনো অর্ডার থেকে শুরু করে বকেয়া অর্ডারগুলোতে বণ্টন করা হবে। যাচাইয়ের পর নিশ্চিত হবে।',
                'Your amount is allocated across unpaid orders (oldest first) and confirmed after verification.',
              )}
            </p>
          </form>
        ) : (
          <div className="pay-note pay-note--ok">
            {t('আপনার কোনো বকেয়া নেই। ধন্যবাদ!', 'You have no outstanding balance. Thank you!')}
          </div>
        )}
      </div>

      <aside className="card orbitax__orders">
        <h2>{t('বকেয়া অর্ডার', 'Outstanding orders')}</h2>
        {account.orders.length === 0 ? (
          <p className="muted">{t('কোনো বকেয়া অর্ডার নেই।', 'No orders with a balance due.')}</p>
        ) : (
          <ul className="orbitax__order-list">
            {account.orders.map((o) => (
              <li key={o.id} className="orbitax__order">
                <div className="orbitax__order-head">
                  <Link to={`/orders/${o.id}`}>{o.orderNumber}</Link>
                  <span className="status status--payment">{paymentStatusLabel[o.paymentStatus]}</span>
                </div>
                <div className="orbitax__order-meta muted">
                  {formatDateWithDay(o.fulfillmentDate)} · {orderStatusLabel[o.status]}
                  {o.paymentMode === 'COD' && <> · {t('ক্যাশ অন ডেলিভারি', 'COD')}</>}
                </div>
                <div className="orbitax__order-amounts">
                  <span>{t('মোট', 'Total')}: {formatBdt(o.total)}</span>
                  <span className="orbitax__order-due">{t('বাকি', 'Due')}: {formatBdt(o.amountDue)}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
        <Link to="/orders" className="orbitax__all-link">{t('সব অর্ডার দেখুন', 'View all my orders')} →</Link>
      </aside>
    </section>
  )
}

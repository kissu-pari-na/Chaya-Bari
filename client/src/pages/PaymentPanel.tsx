import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { bkashCreate, bkashExecute, fetchPaymentInfo, submitClaim } from '../lib/payments'
import { claimMethods, paymentMethodLabel, txnStatusLabel } from '../lib/paymentLabels'
import { formatBdt } from '../lib/format'
import { ApiError } from '../lib/apiClient'
import { useI18n } from '../context/LanguageContext'
import type { Order } from '../types/order'
import type { PaymentInfo, PaymentMethod } from '../types/payment'

interface PaymentPanelProps {
  order: Order
  onOrderChange: (order: Order) => void
}

/// Customer payment options on an order: pay online via bKash, or report a
/// manual payment (cash / transfer) that an admin then verifies.
export function PaymentPanel({ order, onOrderChange }: PaymentPanelProps) {
  const { t } = useI18n()
  const [searchParams, setSearchParams] = useSearchParams()
  const [info, setInfo] = useState<PaymentInfo | null>(null)

  useEffect(() => {
    fetchPaymentInfo()
      .then(setInfo)
      .catch(() => setInfo(null))
  }, [])

  const [method, setMethod] = useState<PaymentMethod>('BKASH')
  const [amount, setAmount] = useState(String(order.amountDue || ''))
  const [reference, setReference] = useState('')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const executedRef = useRef(false)

  const cancelled = order.status === 'CANCELLED'
  const isCod = order.paymentMode === 'COD'
  const due = order.amountDue

  // Complete a bKash payment when the customer returns from the live gateway.
  useEffect(() => {
    const paymentID = searchParams.get('paymentID')
    const status = searchParams.get('status')
    if (!paymentID || executedRef.current) return
    executedRef.current = true
    const params = new URLSearchParams(searchParams)
    params.delete('paymentID')
    params.delete('status')
    setSearchParams(params, { replace: true })
    if (status && status !== 'success') {
      setError(t('বিকাশ পেমেন্ট সম্পন্ন হয়নি।', 'bKash payment was not completed.'))
      return
    }
    bkashExecute(order.id, paymentID)
      .then((r) => {
        onOrderChange(r.order)
        setMsg(
          r.status === 'completed'
            ? t('বিকাশ পেমেন্ট সফল হয়েছে!', 'bKash payment successful!')
            : t('বিকাশ পেমেন্ট সম্পন্ন হয়নি।', 'bKash payment was not completed.'),
        )
      })
      .catch(() => setError(t('বিকাশ পেমেন্ট যাচাই করা যায়নি।', 'Could not verify bKash payment.')))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function payWithBkash() {
    setError(null)
    setMsg(null)
    setBusy(true)
    try {
      const callbackURL = `${window.location.origin}/orders/${order.id}`
      const start = await bkashCreate(order.id, callbackURL, Number(amount) || undefined)
      if (start.mock) {
        // Sandbox: no real gateway page — confirm and settle in place.
        const ok = window.confirm(
          t('বিকাশ (স্যান্ডবক্স): পেমেন্ট সফল হিসেবে সম্পন্ন করবেন?', 'bKash (sandbox): complete this payment as successful?'),
        )
        if (!ok) {
          setMsg(t('বিকাশ পেমেন্ট বাতিল করা হয়েছে।', 'bKash payment cancelled.'))
          return
        }
        const r = await bkashExecute(order.id, start.paymentID)
        onOrderChange(r.order)
        setMsg(
          r.status === 'completed'
            ? t('বিকাশ পেমেন্ট সফল হয়েছে!', 'bKash payment successful!')
            : t('বিকাশ পেমেন্ট সম্পন্ন হয়নি।', 'bKash payment was not completed.'),
        )
      } else {
        window.location.href = start.bkashURL
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('বিকাশ পেমেন্ট শুরু করা যায়নি।', 'Could not start bKash payment.'))
    } finally {
      setBusy(false)
    }
  }
  // bKash online payment is temporarily shown as "coming soon" in the UI. The
  // flow above is intentionally kept in place for when it's switched back on;
  // this reference keeps it from being flagged as unused in the meantime.
  void payWithBkash

  async function handleClaim(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setMsg(null)
    const amt = Number(amount)
    if (!Number.isFinite(amt) || amt <= 0) {
      setError(t('পরিমাণ ০-এর বেশি হতে হবে।', 'Amount must be greater than 0.'))
      return
    }
    if (method !== 'CASH' && !reference.trim()) {
      setError(t('অনলাইন পেমেন্টের জন্য ট্রানজেকশন আইডি/রেফারেন্স দিন।', 'Provide a transaction ID/reference for online payments.'))
      return
    }
    setBusy(true)
    try {
      const r = await submitClaim(order.id, {
        method,
        amount: amt,
        reference: reference || undefined,
        note: note || undefined,
      })
      onOrderChange(r.order)
      setReference('')
      setNote('')
      setMsg(t('পেমেন্টের তথ্য জমা হয়েছে। যাচাইয়ের পর নিশ্চিত করা হবে।', 'Payment details submitted. It will be confirmed after verification.'))
    } catch (err) {
      if (err instanceof ApiError && err.details?.length) setError(err.details.map((d) => d.message).join(' · '))
      else setError(err instanceof ApiError ? err.message : t('তথ্য জমা দেওয়া যায়নি।', 'Could not submit the details.'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="pay-panel">
      <h3>{t('পেমেন্ট', 'Payment')}</h3>

      <div className="pay-panel__summary">
        <span>
          {t('পরিশোধিত:', 'Paid:')} <strong>{formatBdt(order.amountPaid)}</strong>
        </span>
        <span>
          {t('বাকি:', 'Due:')}{' '}
          <strong className={due > 0 ? 'pay-due' : 'pay-paid'}>{formatBdt(due)}</strong>
        </span>
      </div>

      {isCod && due > 0 && !cancelled && (
        <div className="pay-note pay-note--cod">
          {t(
            `এই অর্ডারটি ক্যাশ অন ডেলিভারি — ডেলিভারির সময় ৳${due} নগদে পরিশোধ করুন। চাইলে নিচে আগেই পরিশোধ করেও জানাতে পারেন।`,
            `This is a cash-on-delivery order — please pay ৳${due} in cash when it arrives. You can also pay in advance below if you prefer.`,
          )}
        </div>
      )}

      {msg && <div className="pay-note pay-note--ok">{msg}</div>}
      {error && <div className="pay-note pay-note--err">{error}</div>}

      {/* Payment history */}
      {order.payments.length > 0 && (
        <ul className="pay-history">
          {order.payments.map((p) => (
            <li key={p.id} className="pay-history__row">
              <span>{paymentMethodLabel[p.method]}</span>
              <span>{formatBdt(p.amount)}</span>
              <span className={`pay-chip pay-chip--${p.status.toLowerCase()}`}>{txnStatusLabel[p.status]}</span>
              {p.reference && <span className="muted pay-history__ref">{p.reference}</span>}
            </li>
          ))}
        </ul>
      )}

      {!cancelled && due > 0 && (
        <>
          {/* Online: bKash — temporarily disabled ("coming soon"). The
              payWithBkash flow and gateway logic below are kept intact so this
              can be switched back on later; only the UI is changed here. */}
          <div className="pay-online">
            <button type="button" className="pay-bkash" disabled aria-disabled="true">
              {t('বিকাশে পেমেন্ট করুন', 'Pay with bKash')}
              <span className="pay-soon">{t('শীঘ্রই আসছে', 'Coming soon')}</span>
            </button>
            <p className="hint">{t('বিকাশে অনলাইন পেমেন্ট শীঘ্রই চালু হবে। আপাতত নিচের মাধ্যমে সরাসরি পরিশোধ করে জানান।', 'Online bKash payment is coming soon. For now, please pay directly using the option below and report it.')}</p>
          </div>

          <div className="pay-divider"><span>{t('অথবা', 'or')}</span></div>

          {/* Manual: report a payment you already made */}
          <form className="pay-claim" onSubmit={handleClaim}>
            <p className="pay-claim__title">{t('সরাসরি পরিশোধ করে জানান', 'Report a direct payment')}</p>
            {info && (info.bkash || info.nagad || info.rocket || info.bankInfo) && (
              <div className="pay-accounts">
                {info.bkash && <span>{t('বিকাশ:', 'bKash:')} <strong>{info.bkash}</strong></span>}
                {info.nagad && <span>{t('নগদ:', 'Nagad:')} <strong>{info.nagad}</strong></span>}
                {info.rocket && <span>{t('রকেট:', 'Rocket:')} <strong>{info.rocket}</strong></span>}
                {info.bankInfo && <span>{info.bankInfo}</span>}
              </div>
            )}
            <div className="pay-claim__row">
              <label>
                {t('মাধ্যম', 'Method')}
                <select value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod)}>
                  {claimMethods.map((m) => (
                    <option key={m} value={m}>
                      {paymentMethodLabel[m]}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                {t('পরিমাণ (৳)', 'Amount (৳)')}
                <input type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
              </label>
            </div>
            <label>
              {t('ট্রানজেকশন আইডি / রেফারেন্স', 'Transaction ID / reference')} {method === 'CASH' ? t('(ঐচ্ছিক)', '(optional)') : ''}
              <input value={reference} onChange={(e) => setReference(e.target.value)} placeholder={t('যেমন: bKash TrxID', 'e.g. bKash TrxID')} />
            </label>
            <label>
              {t('নোট (ঐচ্ছিক)', 'Note (optional)')}
              <input value={note} onChange={(e) => setNote(e.target.value)} />
            </label>
            <button type="submit" className="pay-claim__submit" disabled={busy}>
              {t('পেমেন্টের তথ্য জমা দিন', 'Submit payment details')}
            </button>
            <p className="hint">{t('আমরা যাচাই করে পেমেন্ট নিশ্চিত করব।', 'We will verify and confirm the payment.')}</p>
          </form>
        </>
      )}
    </div>
  )
}

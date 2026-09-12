import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { bkashCreate, bkashExecute, fetchPaymentInfo, submitClaim } from '../lib/payments'
import { claimMethods, paymentMethodLabel, txnStatusLabel } from '../lib/paymentLabels'
import { formatBdt } from '../lib/format'
import { ApiError } from '../lib/apiClient'
import type { Order } from '../types/order'
import type { PaymentInfo, PaymentMethod } from '../types/payment'

interface PaymentPanelProps {
  order: Order
  onOrderChange: (order: Order) => void
}

/// Customer payment options on an order: pay online via bKash, or report a
/// manual payment (cash / transfer) that an admin then verifies.
export function PaymentPanel({ order, onOrderChange }: PaymentPanelProps) {
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
      setError('বিকাশ পেমেন্ট সম্পন্ন হয়নি।')
      return
    }
    bkashExecute(order.id, paymentID)
      .then((r) => {
        onOrderChange(r.order)
        setMsg(r.status === 'completed' ? 'বিকাশ পেমেন্ট সফল হয়েছে!' : 'বিকাশ পেমেন্ট সম্পন্ন হয়নি।')
      })
      .catch(() => setError('বিকাশ পেমেন্ট যাচাই করা যায়নি।'))
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
        const ok = window.confirm('বিকাশ (স্যান্ডবক্স): পেমেন্ট সফল হিসেবে সম্পন্ন করবেন?')
        if (!ok) {
          setMsg('বিকাশ পেমেন্ট বাতিল করা হয়েছে।')
          return
        }
        const r = await bkashExecute(order.id, start.paymentID)
        onOrderChange(r.order)
        setMsg(r.status === 'completed' ? 'বিকাশ পেমেন্ট সফল হয়েছে!' : 'বিকাশ পেমেন্ট সম্পন্ন হয়নি।')
      } else {
        window.location.href = start.bkashURL
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'বিকাশ পেমেন্ট শুরু করা যায়নি।')
    } finally {
      setBusy(false)
    }
  }

  async function handleClaim(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setMsg(null)
    const amt = Number(amount)
    if (!Number.isFinite(amt) || amt <= 0) {
      setError('পরিমাণ ০-এর বেশি হতে হবে।')
      return
    }
    if (method !== 'CASH' && !reference.trim()) {
      setError('অনলাইন পেমেন্টের জন্য ট্রানজেকশন আইডি/রেফারেন্স দিন।')
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
      setMsg('পেমেন্টের তথ্য জমা হয়েছে। যাচাইয়ের পর নিশ্চিত করা হবে।')
    } catch (err) {
      if (err instanceof ApiError && err.details?.length) setError(err.details.map((d) => d.message).join(' · '))
      else setError(err instanceof ApiError ? err.message : 'তথ্য জমা দেওয়া যায়নি।')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="pay-panel">
      <h3>পেমেন্ট</h3>

      <div className="pay-panel__summary">
        <span>
          পরিশোধিত: <strong>{formatBdt(order.amountPaid)}</strong>
        </span>
        <span>
          বাকি:{' '}
          <strong className={due > 0 ? 'pay-due' : 'pay-paid'}>{formatBdt(due)}</strong>
        </span>
      </div>

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
          {/* Online: bKash */}
          <div className="pay-online">
            <button type="button" className="pay-bkash" onClick={payWithBkash} disabled={busy}>
              বিকাশে পেমেন্ট করুন (৳{Number(amount) || due})
            </button>
            <p className="hint">বিকাশে তাৎক্ষণিক পেমেন্ট — সফল হলে সঙ্গে সঙ্গে নিশ্চিত হবে।</p>
          </div>

          <div className="pay-divider"><span>অথবা</span></div>

          {/* Manual: report a payment you already made */}
          <form className="pay-claim" onSubmit={handleClaim}>
            <p className="pay-claim__title">সরাসরি পরিশোধ করে জানান</p>
            {info && (info.bkash || info.nagad || info.rocket || info.bankInfo) && (
              <div className="pay-accounts">
                {info.bkash && <span>বিকাশ: <strong>{info.bkash}</strong></span>}
                {info.nagad && <span>নগদ: <strong>{info.nagad}</strong></span>}
                {info.rocket && <span>রকেট: <strong>{info.rocket}</strong></span>}
                {info.bankInfo && <span>{info.bankInfo}</span>}
              </div>
            )}
            <div className="pay-claim__row">
              <label>
                মাধ্যম
                <select value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod)}>
                  {claimMethods.map((m) => (
                    <option key={m} value={m}>
                      {paymentMethodLabel[m]}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                পরিমাণ (৳)
                <input type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
              </label>
            </div>
            <label>
              ট্রানজেকশন আইডি / রেফারেন্স {method === 'CASH' ? '(ঐচ্ছিক)' : ''}
              <input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="যেমন: bKash TrxID" />
            </label>
            <label>
              নোট (ঐচ্ছিক)
              <input value={note} onChange={(e) => setNote(e.target.value)} />
            </label>
            <button type="submit" className="pay-claim__submit" disabled={busy}>
              পেমেন্টের তথ্য জমা দিন
            </button>
            <p className="hint">আমরা যাচাই করে পেমেন্ট নিশ্চিত করব।</p>
          </form>
        </>
      )}
    </div>
  )
}

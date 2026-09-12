import { useEffect, useState, type FormEvent } from 'react'
import { deletePayment, fetchPayments, gatewayCharge, recordPayment } from '../../lib/payments'
import { paymentMethodLabel, paymentMethods, txnStatusLabel, txnStatuses } from '../../lib/paymentLabels'
import { paymentStatusLabel } from '../../lib/orderStatus'
import { formatBdt } from '../../lib/format'
import { ApiError } from '../../lib/apiClient'
import type { Payment, PaymentMethod, PaymentTxnStatus } from '../../types/payment'
import type { AdminOrder } from '../../types/order'
import './Admin.css'

interface PaymentsSectionProps {
  order: AdminOrder
  onOrderChange: (order: AdminOrder) => void
}

export function PaymentsSection({ order, onOrderChange }: PaymentsSectionProps) {
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [method, setMethod] = useState<PaymentMethod>('CASH')
  const [amount, setAmount] = useState(String(order.amountDue || ''))
  const [status, setStatus] = useState<PaymentTxnStatus>('SUCCESS')
  const [reference, setReference] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchPayments(order.id)
      .then(setPayments)
      .finally(() => setLoading(false))
  }, [order.id])

  async function handleRecord(event: FormEvent) {
    event.preventDefault()
    setError(null)
    const amt = Number(amount)
    if (!Number.isFinite(amt) || amt <= 0) {
      setError('পরিমাণ ০-এর বেশি হতে হবে')
      return
    }
    try {
      const { payment, order: updated } = await recordPayment(order.id, {
        method,
        amount: amt,
        status,
        reference: reference || undefined,
      })
      setPayments((ps) => [...ps, payment])
      onOrderChange(updated)
      setReference('')
      setAmount(String(updated.amountDue || ''))
    } catch (err) {
      if (err instanceof ApiError && err.details?.length) setError(err.details.map((d) => d.message).join(' · '))
      else setError(err instanceof ApiError ? err.message : 'পেমেন্ট রেকর্ড করা যায়নি')
    }
  }

  async function handleGateway() {
    setError(null)
    const amt = Number(amount) || order.amountDue
    if (!amt || amt <= 0) {
      setError('বকেয়া নেই — পরিমাণ দিন')
      return
    }
    try {
      const { payment, order: updated } = await gatewayCharge(order.id, amt, 'BKASH')
      setPayments((ps) => [...ps, payment])
      onOrderChange(updated)
      setAmount(String(updated.amountDue || ''))
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'গেটওয়ে পেমেন্ট ব্যর্থ')
    }
  }

  async function handleDelete(payment: Payment) {
    if (!window.confirm('এই পেমেন্ট রেকর্ডটি মুছবেন?')) return
    await deletePayment(payment.id)
    const refreshed = await fetchPayments(order.id)
    setPayments(refreshed)
    // Re-derive paid/due locally for the summary via a fresh fetch of the order.
    // Simpler: recompute from rows here.
    const paid = refreshed.reduce(
      (s, p) => (p.status === 'SUCCESS' ? s + p.amount : p.status === 'REFUNDED' ? s - p.amount : s),
      0,
    )
    onOrderChange({ ...order, amountPaid: paid, amountDue: Math.max(0, order.total - paid) })
  }

  return (
    <div className="payments-panel">
      <h3>পেমেন্ট</h3>

      <div className="pay-summary">
        <div>
          <span className="delivery-costs__label">পরিশোধিত</span>
          <span className="delivery-costs__value">{formatBdt(order.amountPaid)}</span>
        </div>
        <div>
          <span className="delivery-costs__label">বাকি</span>
          <span className={order.amountDue > 0 ? 'delivery-costs__value delivery-loss' : 'delivery-costs__value delivery-gain'}>
            {formatBdt(order.amountDue)}
          </span>
        </div>
        <div>
          <span className="delivery-costs__label">স্ট্যাটাস</span>
          <span className="delivery-costs__value">{paymentStatusLabel[order.paymentStatus]}</span>
        </div>
      </div>

      {loading ? (
        <p className="muted">লোড হচ্ছে…</p>
      ) : (
        payments.length > 0 && (
          <table className="admin-table pay-table">
            <thead>
              <tr>
                <th>মাধ্যম</th>
                <th>পরিমাণ</th>
                <th>স্ট্যাটাস</th>
                <th>রেফারেন্স</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id}>
                  <td>{paymentMethodLabel[p.method]}</td>
                  <td>{formatBdt(p.amount)}</td>
                  <td>{txnStatusLabel[p.status]}</td>
                  <td>{p.reference ?? '—'}</td>
                  <td className="admin-table__actions">
                    <button className="btn-danger" onClick={() => handleDelete(p)}>মুছুন</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )
      )}

      <form className="pay-form" onSubmit={handleRecord}>
        {error && <div className="auth-error">{error}</div>}
        <div className="admin-form__row">
          <label>
            মাধ্যম
            <select value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod)}>
              {paymentMethods.map((m) => (
                <option key={m} value={m}>
                  {paymentMethodLabel[m]}
                </option>
              ))}
            </select>
          </label>
          <label>
            পরিমাণ (৳)
            <input type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} required />
          </label>
          <label>
            ধরন
            <select value={status} onChange={(e) => setStatus(e.target.value as PaymentTxnStatus)}>
              {txnStatuses.map((s) => (
                <option key={s} value={s}>
                  {txnStatusLabel[s]}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="admin-form__row">
          <label>
            রেফারেন্স (ট্রানজেকশন আইডি)
            <input value={reference} onChange={(e) => setReference(e.target.value)} />
          </label>
        </div>
        <div className="admin-form__actions">
          <button type="submit">পেমেন্ট রেকর্ড করুন</button>
          <button type="button" className="btn-ghost" onClick={handleGateway}>
            অনলাইন পেমেন্ট নিন (বিকাশ মক)
          </button>
        </div>
        <p className="hint">অনলাইন পেমেন্ট বিকাশ/গেটওয়ে ইন্টিগ্রেশন পয়েন্ট — মক চার্জ সফল পেমেন্ট হিসেবে রেকর্ড হবে।</p>
      </form>
    </div>
  )
}

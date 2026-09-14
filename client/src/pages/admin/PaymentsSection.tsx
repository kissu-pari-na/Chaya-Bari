import { useEffect, useState, type FormEvent } from 'react'
import { deletePayment, fetchPayments, recordPayment, verifyPayment } from '../../lib/payments'
import { paymentMethodLabel, paymentMethods, paymentSourceLabel, txnStatusLabel, txnStatuses } from '../../lib/paymentLabels'
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

  const pendingCount = payments.filter((p) => p.status === 'PENDING').length

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

  async function handleVerify(payment: Payment, action: 'verify' | 'reject') {
    setError(null)
    try {
      const { payment: updated, order: refreshed } = await verifyPayment(payment.id, action)
      setPayments((ps) => ps.map((p) => (p.id === updated.id ? updated : p)))
      onOrderChange(refreshed)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'যাচাই করা যায়নি')
    }
  }

  async function handleDelete(payment: Payment) {
    if (!window.confirm('এই পেমেন্ট রেকর্ডটি মুছবেন?')) return
    await deletePayment(payment.id)
    const refreshed = await fetchPayments(order.id)
    setPayments(refreshed)
    const paid = refreshed.reduce(
      (s, p) => (p.status === 'SUCCESS' ? s + p.amount : p.status === 'REFUNDED' ? s - p.amount : s),
      0,
    )
    onOrderChange({ ...order, amountPaid: paid, amountDue: Math.max(0, order.total - paid) })
  }

  return (
    <div className="payments-panel">
      <h3>
        পেমেন্ট
        {pendingCount > 0 && <span className="pay-pending-badge">{pendingCount} যাচাইয়ের অপেক্ষায়</span>}
      </h3>

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
                <th>উৎস</th>
                <th>পরিমাণ</th>
                <th>স্ট্যাটাস</th>
                <th>রেফারেন্স</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id} className={p.status === 'PENDING' ? 'pay-row--pending' : undefined}>
                  <td>{paymentMethodLabel[p.method]}</td>
                  <td>{paymentSourceLabel[p.source]}</td>
                  <td>{formatBdt(p.amount)}</td>
                  <td>{txnStatusLabel[p.status]}</td>
                  <td>{p.reference ?? '—'}</td>
                  <td className="admin-table__actions">
                    {p.status === 'PENDING' ? (
                      <>
                        <button className="btn-mini btn-mini--ok" onClick={() => handleVerify(p, 'verify')}>
                          নিশ্চিত
                        </button>
                        <button className="btn-mini btn-mini--no" onClick={() => handleVerify(p, 'reject')}>
                          বাতিল
                        </button>
                      </>
                    ) : (
                      <button className="btn-danger" onClick={() => handleDelete(p)}>মুছুন</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )
      )}

      <form className="pay-form" onSubmit={handleRecord}>
        {error && <div className="auth-error">{error}</div>}
        <p className="hint" style={{ marginTop: 0 }}>অ্যাডমিন হিসেবে সরাসরি নিশ্চিত পেমেন্ট রেকর্ড করুন।</p>
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
        </div>
      </form>
    </div>
  )
}

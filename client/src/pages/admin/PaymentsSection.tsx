import { useEffect, useState, type FormEvent } from 'react'
import { fetchPayments, recordPayment, refundPayment, verifyPayment, voidPayment } from '../../lib/payments'
import { paymentMethodLabel, paymentMethods, paymentSourceLabel, txnStatusLabel, txnStatuses } from '../../lib/paymentLabels'
import { paymentStatusLabel } from '../../lib/orderStatus'
import { formatBdt } from '../../lib/format'
import { ApiError } from '../../lib/apiClient'
import { usePoll } from '../../lib/usePoll'
import { useI18n } from '../../context/LanguageContext'
import type { Payment, PaymentMethod, PaymentTxnStatus } from '../../types/payment'
import type { AdminOrder } from '../../types/order'
import './Admin.css'

interface PaymentsSectionProps {
  order: AdminOrder
  onOrderChange: (order: AdminOrder) => void
}

export function PaymentsSection({ order, onOrderChange }: PaymentsSectionProps) {
  const { t } = useI18n()
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
  const cancelled = order.status === 'CANCELLED'

  // Live updates: refresh the payments list so a customer's new claim shows up
  // for verification without a manual refresh (stops once cancelled/locked).
  usePoll(() => {
    fetchPayments(order.id).then(setPayments).catch(() => {})
  }, 15000, !cancelled)

  async function handleRecord(event: FormEvent) {
    event.preventDefault()
    setError(null)
    const amt = Number(amount)
    if (!Number.isFinite(amt) || amt <= 0) {
      setError(t('পরিমাণ ০-এর বেশি হতে হবে', 'Amount must be greater than 0'))
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
      else setError(err instanceof ApiError ? err.message : t('পেমেন্ট রেকর্ড করা যায়নি', 'Could not record payment'))
    }
  }

  async function handleVerify(payment: Payment, action: 'verify' | 'reject') {
    setError(null)
    try {
      const { payment: updated, order: refreshed } = await verifyPayment(payment.id, action)
      setPayments((ps) => ps.map((p) => (p.id === updated.id ? updated : p)))
      onOrderChange(refreshed)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('যাচাই করা যায়নি', 'Could not verify'))
    }
  }

  // Payments are never deleted. A payment recorded in error is VOIDed; money
  // returned to the customer is a REFUND. Both keep the row for audit and stamp
  // who did it.
  async function handleVoid(payment: Payment) {
    const reason = window.prompt(t('বাতিলের কারণ (ঐচ্ছিক):', 'Reason for voiding (optional):'))
    if (reason === null) return // cancelled
    setError(null)
    try {
      const { order: refreshed } = await voidPayment(payment.id, reason || undefined)
      setPayments(await fetchPayments(order.id))
      onOrderChange(refreshed)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('বাতিল করা যায়নি', 'Could not void the payment'))
    }
  }

  async function handleRefund(payment: Payment) {
    const amtStr = window.prompt(t('ফেরতের পরিমাণ (৳):', 'Refund amount (৳):'), String(payment.amount))
    if (amtStr === null) return
    const amt = Number(amtStr)
    if (!Number.isFinite(amt) || amt <= 0) {
      setError(t('পরিমাণ ০-এর বেশি হতে হবে', 'Amount must be greater than 0'))
      return
    }
    const reason = window.prompt(t('ফেরতের কারণ (ঐচ্ছিক):', 'Reason for refund (optional):'))
    if (reason === null) return
    setError(null)
    try {
      const { order: refreshed } = await refundPayment(payment.id, amt, reason || undefined)
      setPayments(await fetchPayments(order.id))
      onOrderChange(refreshed)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('ফেরত দেওয়া যায়নি', 'Could not refund the payment'))
    }
  }

  return (
    <div className="payments-panel">
      <h3>
        {t('পেমেন্ট', 'Payment')}
        {pendingCount > 0 && <span className="pay-pending-badge">{pendingCount} {t('যাচাইয়ের অপেক্ষায়', 'awaiting verification')}</span>}
      </h3>

      <div className="pay-summary">
        <div>
          <span className="delivery-costs__label">{t('পরিশোধিত', 'Paid')}</span>
          <span className="delivery-costs__value">{formatBdt(order.amountPaid)}</span>
        </div>
        <div>
          <span className="delivery-costs__label">{t('বাকি', 'Due')}</span>
          <span className={order.amountDue > 0 ? 'delivery-costs__value delivery-loss' : 'delivery-costs__value delivery-gain'}>
            {formatBdt(order.amountDue)}
          </span>
        </div>
        <div>
          <span className="delivery-costs__label">{t('স্ট্যাটাস', 'Status')}</span>
          <span className="delivery-costs__value">{paymentStatusLabel[order.paymentStatus]}</span>
        </div>
      </div>

      {loading ? (
        <p className="muted">{t('লোড হচ্ছে…', 'Loading…')}</p>
      ) : (
        payments.length > 0 && (
          <table className="admin-table pay-table">
            <thead>
              <tr>
                <th>{t('মাধ্যম', 'Method')}</th>
                <th>{t('উৎস', 'Source')}</th>
                <th>{t('পরিমাণ', 'Amount')}</th>
                <th>{t('স্ট্যাটাস', 'Status')}</th>
                <th>{t('রেফারেন্স', 'Reference')}</th>
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
                  <td>
                    {p.reference ?? '—'}
                    {p.status === 'VOID' && p.voidedByName && (
                      <div className="muted pay-audit">
                        {t(`বাতিল: ${p.voidedByName}`, `Voided by ${p.voidedByName}`)}
                        {p.voidReason ? ` — ${p.voidReason}` : ''}
                      </div>
                    )}
                    {p.status === 'REFUNDED' && p.recordedByName && (
                      <div className="muted pay-audit">
                        {t(`ফেরত: ${p.recordedByName}`, `Refunded by ${p.recordedByName}`)}
                        {p.note ? ` — ${p.note}` : ''}
                      </div>
                    )}
                  </td>
                  <td className="admin-table__actions">
                    {cancelled ? (
                      <span className="muted">—</span>
                    ) : p.status === 'PENDING' ? (
                      <>
                        <button className="btn-mini btn-mini--ok" onClick={() => handleVerify(p, 'verify')}>
                          {t('নিশ্চিত', 'Confirm')}
                        </button>
                        <button className="btn-mini btn-mini--no" onClick={() => handleVerify(p, 'reject')}>
                          {t('বাতিল', 'Reject')}
                        </button>
                      </>
                    ) : p.status === 'SUCCESS' ? (
                      <>
                        <button className="btn-mini" onClick={() => handleRefund(p)}>
                          {t('ফেরত', 'Refund')}
                        </button>
                        <button className="btn-mini btn-mini--no" onClick={() => handleVoid(p)}>
                          {t('বাতিল', 'Void')}
                        </button>
                      </>
                    ) : (
                      <span className="muted">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )
      )}

      {cancelled ? (
        <p className="hint" style={{ marginTop: '0.5rem' }}>
          {t('এই অর্ডারটি বাতিল হয়েছে — পেমেন্ট সংক্রান্ত কোনো পরিবর্তন করা যাবে না।', 'This order is cancelled — payment changes are locked.')}
        </p>
      ) : (
      <form className="pay-form" onSubmit={handleRecord}>
        {error && <div className="auth-error">{error}</div>}
        <p className="hint" style={{ marginTop: 0 }}>{t('অ্যাডমিন হিসেবে সরাসরি নিশ্চিত পেমেন্ট রেকর্ড করুন।', 'Record a confirmed payment directly as an admin.')}</p>
        <div className="admin-form__row">
          <label>
            {t('মাধ্যম', 'Method')}
            <select value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod)}>
              {paymentMethods.map((m) => (
                <option key={m} value={m}>
                  {paymentMethodLabel[m]}
                </option>
              ))}
            </select>
          </label>
          <label>
            {t('পরিমাণ (৳)', 'Amount (৳)')}
            <input type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} required />
          </label>
          <label>
            {t('ধরন', 'Type')}
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
            {t('রেফারেন্স (ট্রানজেকশন আইডি)', 'Reference (transaction ID)')}
            <input value={reference} onChange={(e) => setReference(e.target.value)} />
          </label>
        </div>
        <div className="admin-form__actions">
          <button type="submit">{t('পেমেন্ট রেকর্ড করুন', 'Record payment')}</button>
        </div>
      </form>
      )}
    </div>
  )
}

import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { recordOrderPayment, reviewClaim } from '../../lib/wallet'
import { updateOrderPaymentMode } from '../../lib/orders'
import { formatBdt } from '../../lib/format'
import { paymentModeLabel, paymentStatusClass, paymentStatusLabel } from '../../lib/orderStatus'
import { paymentModes } from '../../lib/orderEnums'
import { paymentMethodLabel, paymentMethods } from '../../lib/paymentLabels'
import { ApiError } from '../../lib/apiClient'
import { useI18n } from '../../context/LanguageContext'
import { WalletTimeline } from '../../components/WalletTimeline'
import type { AdminOrder, PaymentMode } from '../../types/order'
import type { PaymentMethod } from '../../types/payment'
import './Admin.css'

/// Money for one order: method (changeable while pending), paid / due / on
/// wallet, claims to review, a form to record money received, and the order's
/// payment history. Customer-level adjustments live on their wallet page.
export function PaymentsSection({ order, onOrderChange, onRefresh }: { order: AdminOrder; onOrderChange: (o: AdminOrder) => void; onRefresh: () => void }) {
  const { t } = useI18n()
  const [method, setMethod] = useState<PaymentMethod>('BKASH')
  const [amount, setAmount] = useState('')
  const [reference, setReference] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const cancelled = order.status === 'CANCELLED'
  const pendingClaims = order.payments.filter((p) => p.type === 'PAYMENT' && p.status === 'PENDING')

  async function run(fn: () => Promise<void>) {
    setBusy(true)
    setError(null)
    try {
      await fn()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('কাজটি করা যায়নি', 'Could not complete that'))
    } finally {
      setBusy(false)
    }
  }

  function record(e: FormEvent) {
    e.preventDefault()
    void run(async () => {
      onOrderChange(await recordOrderPayment(order.id, { amount: Number(amount), method, reference: reference.trim() }))
      setAmount('')
      setReference('')
    })
  }

  function review(id: string, action: 'confirm' | 'reject') {
    const note = action === 'reject' ? window.prompt(t('বাতিলের কারণ লিখুন', 'Reason for rejecting')) ?? '' : undefined
    if (action === 'reject' && !note) return
    void run(async () => {
      await reviewClaim(id, action, note)
      onRefresh()
    })
  }

  return (
    <section className="admin-card">
      <div className="admin-card__head">
        <h2>{t('পেমেন্ট', 'Payment')}</h2>
        <span className={paymentStatusClass[order.paymentStatus]}>{paymentStatusLabel[order.paymentStatus]}</span>
      </div>
      {error && <p className="pay-note pay-note--err">{error}</p>}

      <dl className="facts">
        <div>
          <dt>{t('পদ্ধতি', 'Method')}</dt>
          <dd>
            {order.status === 'PENDING' ? (
              <select
                value={order.paymentMode}
                disabled={busy}
                onChange={(e) => run(async () => onOrderChange(await updateOrderPaymentMode(order.id, e.target.value as PaymentMode)))}
                aria-label={t('পেমেন্ট পদ্ধতি', 'Payment method')}
              >
                {paymentModes
                  .filter((m) => m !== 'PAY_LATER' || !order.customer.isGuest)
                  .map((m) => (
                    <option key={m} value={m}>
                      {paymentModeLabel[m]}
                    </option>
                  ))}
              </select>
            ) : (
              paymentModeLabel[order.paymentMode]
            )}
          </dd>
        </div>
        <div>
          <dt>{t('মোট', 'Total')}</dt>
          <dd className="num">{formatBdt(order.total)}</dd>
        </div>
        <div>
          <dt>{t('পরিশোধিত', 'Paid')}</dt>
          <dd className="num tone-gain">{formatBdt(order.amountPaid)}</dd>
        </div>
        {order.amountDue > 0 && (
          <div>
            <dt>{t('বাকি', 'Due')}</dt>
            <dd className="num tone-warn">{formatBdt(order.amountDue)}</dd>
          </div>
        )}
        {order.onWallet > 0 && (
          <div>
            <dt>{t('ওয়ালেটে', 'On wallet')}</dt>
            <dd className="num">{formatBdt(order.onWallet)}</dd>
          </div>
        )}
      </dl>

      {pendingClaims.length > 0 && (
        <div className="claims-inline">
          <strong>{t('যাচাই করুন', 'To review')}</strong>
          {pendingClaims.map((c) => (
            <div key={c.id} className="claims-inline__row">
              <span>
                <strong className="num">{formatBdt(c.amount)}</strong> · {c.method ? paymentMethodLabel[c.method] : ''} · {t('রেফ', 'Ref')}{' '}
                <span className="num">{c.reference}</span>
              </span>
              <span className="claims-inline__actions">
                <button type="button" className="btn btn--primary btn--sm" disabled={busy} onClick={() => review(c.id, 'confirm')}>
                  ✓ {t('নিশ্চিত', 'Confirm')}
                </button>
                <button type="button" className="btn btn--danger btn--sm" disabled={busy} onClick={() => review(c.id, 'reject')}>
                  ✕ {t('বাতিল', 'Reject')}
                </button>
              </span>
            </div>
          ))}
        </div>
      )}

      {!cancelled && (
        <form className="admin-form admin-form--compact admin-form--inline" onSubmit={record}>
          <strong className="admin-form__title">{t('টাকা গ্রহণ রেকর্ড করুন', 'Record money received')}</strong>
          <select value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod)} aria-label={t('মাধ্যম', 'Method')}>
            {paymentMethods.map((m) => (
              <option key={m} value={m}>
                {paymentMethodLabel[m]}
              </option>
            ))}
          </select>
          <input type="number" min={1} step="any" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder={t('পরিমাণ', 'Amount')} aria-label={t('পরিমাণ', 'Amount')} required />
          <input value={reference} onChange={(e) => setReference(e.target.value)} placeholder={t('রেফারেন্স (TrxID/রসিদ)', 'Reference (TrxID/receipt)')} aria-label={t('রেফারেন্স', 'Reference')} required minLength={3} />
          <button type="submit" className="btn btn--soft btn--sm" disabled={busy}>
            {t('রেকর্ড', 'Record')}
          </button>
        </form>
      )}

      {order.payments.length > 0 && (
        <WalletTimeline
          entries={order.payments.map((p) => ({ ...p, orderId: null, orderNumber: null, reviewedAt: null, balanceAfter: null }))}
        />
      )}
      {order.customer.id && (
        <p className="muted">
          <Link to={`/admin/wallets/${order.customer.id}`}>{t('গ্রাহকের ওয়ালেট দেখুন', "Open the customer's wallet")} →</Link>
        </p>
      )}
    </section>
  )
}

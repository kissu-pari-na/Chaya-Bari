import { Link } from 'react-router-dom'
import { formatBdt } from '../lib/format'
import { paymentModeLabel } from '../lib/orderStatus'
import { useI18n } from '../context/LanguageContext'
import { PayToUs } from './PayToUs'
import { ClaimForm } from './ClaimForm'
import type { Order } from '../types/order'
import './Pay.css'

/// What the customer needs to do about paying for this order, by method:
///  - pay first: where to pay, how much, the reference, and the claim form;
///  - pay later: it is on the wallet;
///  - cash on delivery: how much to keep ready.
/// `onClaimed` refreshes the order after a payment is reported.
export function OrderPaymentBox({ order, onClaimed, guest = false }: { order: Order; onClaimed?: () => void; guest?: boolean }) {
  const { t } = useI18n()
  if (order.status === 'CANCELLED') return null

  const pendingClaim = order.payments.find((p) => p.type === 'PAYMENT' && p.status === 'PENDING')
  const rejected = order.payments.filter((p) => p.type === 'PAYMENT' && p.status === 'REJECTED').slice(-1)[0]

  if (order.paymentMode === 'PAY_FIRST') {
    if (order.paymentStatus === 'PAID') {
      return (
        <div className="pay-box pay-box--done">
          <strong>✓ {t('পরিশোধিত', 'Paid')}</strong> · {formatBdt(order.total)}
        </div>
      )
    }
    return (
      <section className="pay-box">
        <h2>
          {t('অর্ডারের জন্য পেমেন্ট করুন', 'Pay for this order')} · <span className="num">{formatBdt(order.amountDue)}</span>
        </h2>
        {pendingClaim ? (
          <p className="status status--pending">
            {t(
              `আপনার ${formatBdt(pendingClaim.amount)} পেমেন্ট যাচাইয়ের অপেক্ষায় — নিশ্চিত হলে অর্ডার নিজে থেকেই নিশ্চিত হবে।`,
              `Your ${formatBdt(pendingClaim.amount)} payment is being reviewed — the order confirms automatically once it's verified.`,
            )}
          </p>
        ) : (
          rejected && (
            <p className="pay-note pay-note--err">
              {t('আগের পেমেন্ট যাচাই করা যায়নি', "Your last payment couldn't be verified")}
              {rejected.reviewNote ? `: ${rejected.reviewNote}` : ''}. {t('আবার চেষ্টা করুন।', 'Please try again.')}
            </p>
          )
        )}
        <PayToUs amount={order.amountDue} reference={order.orderNumber} />
        {guest ? (
          <p className="muted">
            {t(
              'পাঠানোর পর ফোন বা মেসেজে আমাদের TrxID জানান — আমরা যাচাই করে অর্ডার নিশ্চিত করব।',
              'After sending, tell us the TrxID by phone or message — we will verify it and confirm your order.',
            )}
          </p>
        ) : (
          !pendingClaim && <ClaimForm defaultAmount={order.amountDue} orderId={order.id} onSubmitted={onClaimed} />
        )}
      </section>
    )
  }

  if (order.paymentMode === 'PAY_LATER') {
    return (
      <div className="pay-box pay-box--info">
        <strong>{paymentModeLabel.PAY_LATER}</strong> ·{' '}
        {t(
          `${formatBdt(order.onWallet || order.total)} আপনার ওয়ালেটে যোগ হয়েছে।`,
          `${formatBdt(order.onWallet || order.total)} was added to your wallet.`,
        )}{' '}
        <Link to="/wallet">{t('ওয়ালেট দেখুন', 'View wallet')} →</Link>
      </div>
    )
  }

  // Cash on delivery
  if (order.status === 'DELIVERED') {
    return (
      <div className={order.onWallet > 0 ? 'pay-box pay-box--info' : 'pay-box pay-box--done'}>
        <strong>✓ {t('ডেলিভারিতে পরিশোধিত', 'Paid on delivery')}</strong> · {formatBdt(order.amountPaid)}
        {order.onWallet > 0 && (
          <>
            {' '}
            · {t(`বাকি ${formatBdt(order.onWallet)} ওয়ালেটে`, `${formatBdt(order.onWallet)} left on your wallet`)}{' '}
            <Link to="/wallet">{t('ওয়ালেট', 'Wallet')} →</Link>
          </>
        )}
      </div>
    )
  }
  return (
    <div className="pay-box pay-box--info">
      <strong>{paymentModeLabel.COD}</strong> ·{' '}
      {t(`ডেলিভারির সময় ${formatBdt(order.amountDue)} নগদ প্রস্তুত রাখুন।`, `Keep ${formatBdt(order.amountDue)} in cash ready at delivery.`)}
    </div>
  )
}

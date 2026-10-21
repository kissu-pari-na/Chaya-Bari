import { useEffect, useState } from 'react'
import { fetchPaymentInfo } from '../lib/payments'
import { formatBdt } from '../lib/format'
import { useI18n } from '../context/LanguageContext'
import type { PaymentInfo } from '../types/payment'
import './Pay.css'

/// One tap copies a value (account number, amount, reference) to the clipboard.
export function CopyButton({ value, label }: { value: string; label: string }) {
  const { t } = useI18n()
  const [copied, setCopied] = useState(false)
  return (
    <button
      type="button"
      className="copy-btn"
      aria-label={t(`${label} কপি করুন`, `Copy ${label}`)}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value)
          setCopied(true)
          window.setTimeout(() => setCopied(false), 1600)
        } catch {
          /* clipboard unavailable */
        }
      }}
    >
      {copied ? `✓ ${t('কপি হয়েছে', 'Copied')}` : t('কপি', 'Copy')}
    </button>
  )
}

/// Where and how to pay us manually (no online gateway, vault D-BKS-003): the
/// business's bKash / Nagad / Rocket numbers and bank details, the exact amount
/// and the reference to write, each with a one-tap copy (vault I-PAY-001).
export function PayToUs({ amount, reference }: { amount?: number; reference?: string }) {
  const { t } = useI18n()
  const [info, setInfo] = useState<PaymentInfo | null>(null)
  useEffect(() => {
    fetchPaymentInfo()
      .then(setInfo)
      .catch(() => setInfo(null))
  }, [])

  const accounts = [
    { key: 'bKash', value: info?.bkash },
    { key: 'Nagad', value: info?.nagad },
    { key: 'Rocket', value: info?.rocket },
  ].filter((a): a is { key: string; value: string } => !!a.value)

  return (
    <div className="pay-to-us">
      <p className="pay-to-us__step">
        <span className="pay-to-us__n">1</span>
        {t('নিচের যেকোনো অ্যাকাউন্টে "Send Money" করুন:', 'Send Money to any of these accounts:')}
      </p>
      {accounts.length === 0 && !info?.bankInfo ? (
        <p className="muted">{t('পেমেন্ট অ্যাকাউন্টের তথ্য শীঘ্রই যোগ করা হবে।', 'Payment account details will be added soon.')}</p>
      ) : (
        <ul className="pay-to-us__list">
          {accounts.map((a) => (
            <li key={a.key}>
              <span className="pay-to-us__label">{a.key}</span>
              <span className="pay-to-us__value num">{a.value}</span>
              <CopyButton value={a.value} label={a.key} />
            </li>
          ))}
          {info?.bankInfo && (
            <li>
              <span className="pay-to-us__label">{t('ব্যাংক', 'Bank')}</span>
              <span className="pay-to-us__value">{info.bankInfo}</span>
              <CopyButton value={info.bankInfo} label={t('ব্যাংক তথ্য', 'bank details')} />
            </li>
          )}
        </ul>
      )}
      {(amount != null || reference) && (
        <ul className="pay-to-us__list pay-to-us__list--plain">
          {amount != null && amount > 0 && (
            <li>
              <span className="pay-to-us__label">{t('পরিমাণ', 'Amount')}</span>
              <span className="pay-to-us__value num">{formatBdt(amount)}</span>
              <CopyButton value={String(amount)} label={t('পরিমাণ', 'amount')} />
            </li>
          )}
          {reference && (
            <li>
              <span className="pay-to-us__label">{t('রেফারেন্সে লিখুন', 'Write in reference')}</span>
              <span className="pay-to-us__value num">{reference}</span>
              <CopyButton value={reference} label={t('রেফারেন্স', 'reference')} />
            </li>
          )}
        </ul>
      )}
      <p className="pay-to-us__step">
        <span className="pay-to-us__n">2</span>
        {t('তারপর লেনদেনের Transaction ID (TrxID) দিয়ে নিচে জমা দিন।', 'Then submit the Transaction ID (TrxID) below.')}
      </p>
    </div>
  )
}

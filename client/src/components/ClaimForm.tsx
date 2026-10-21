import { useState, type FormEvent } from 'react'
import { submitClaim } from '../lib/wallet'
import { claimMethods, paymentMethodLabel } from '../lib/paymentLabels'
import { ApiError } from '../lib/apiClient'
import { useI18n } from '../context/LanguageContext'
import type { PaymentMethod, WalletEntry } from '../types/payment'
import './Pay.css'

interface ClaimFormProps {
  /// Pre-filled amount (e.g. what an order still owes).
  defaultAmount?: number
  /// Link the payment to a pay-first order, so it settles that order first.
  orderId?: string
  onSubmitted?: (entry: WalletEntry) => void
}

/// Report a manual payment with its transaction reference. It shows as
/// "awaiting review" until an admin confirms it, then it is added to the wallet.
export function ClaimForm({ defaultAmount, orderId, onSubmitted }: ClaimFormProps) {
  const { t } = useI18n()
  const [method, setMethod] = useState<PaymentMethod>('BKASH')
  const [amount, setAmount] = useState(defaultAmount ? String(defaultAmount) : '')
  const [reference, setReference] = useState('')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      const entry = await submitClaim({
        method,
        amount: Number(amount),
        reference: reference.trim(),
        note: note.trim() || undefined,
        orderId,
      })
      setDone(true)
      setReference('')
      setNote('')
      onSubmitted?.(entry)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('জমা দেওয়া যায়নি', 'Could not submit'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="claim-form" onSubmit={submit}>
      {done && (
        <div className="pay-note pay-note--ok" role="status">
          {t(
            'ধন্যবাদ! আপনার পেমেন্ট যাচাইয়ের জন্য জমা হয়েছে। নিশ্চিত হলে জানিয়ে দেব।',
            "Thanks! Your payment was submitted for review. We'll notify you once it's confirmed.",
          )}
        </div>
      )}
      {error && <div className="pay-note pay-note--err">{error}</div>}
      <div className="claim-form__row">
        <label>
          {t('মাধ্যম', 'Paid by')}
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
          <input type="number" inputMode="decimal" min={1} step="any" value={amount} onChange={(e) => setAmount(e.target.value)} required />
        </label>
      </div>
      <label>
        {t('ট্রানজেকশন আইডি / রেফারেন্স', 'Transaction ID / reference')}
        <input
          value={reference}
          onChange={(e) => setReference(e.target.value)}
          required
          minLength={3}
          maxLength={120}
          placeholder={t('যেমন: 9K7A2B3C4D', 'e.g. 9K7A2B3C4D')}
          autoComplete="off"
        />
      </label>
      <label>
        {t('নোট (ঐচ্ছিক)', 'Note (optional)')}
        <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} placeholder={t('যে নম্বর থেকে পাঠিয়েছেন', 'The number you sent from')} />
      </label>
      <button type="submit" className="btn btn--primary" disabled={busy}>
        {busy ? t('জমা হচ্ছে…', 'Submitting…') : t('পেমেন্ট জমা দিন', 'Submit payment')}
      </button>
    </form>
  )
}

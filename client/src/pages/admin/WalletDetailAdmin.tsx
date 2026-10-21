import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { adjustWallet, fetchCustomerWallet } from '../../lib/wallet'
import { formatBdt } from '../../lib/format'
import { paymentMethodLabel, paymentMethods } from '../../lib/paymentLabels'
import { ApiError } from '../../lib/apiClient'
import { useI18n } from '../../context/LanguageContext'
import { WalletTimeline } from '../../components/WalletTimeline'
import type { PaymentMethod, WalletEntry, WalletSummary } from '../../types/payment'
import './Admin.css'

type Customer = { id: string; name: string; email: string; phone: string | null }

/// One customer's wallet: balance, limit, an adjustment form (credit or debit,
/// always with a reference) and the full timeline.
export function WalletDetailAdmin() {
  const { t } = useI18n()
  const { customerId = '' } = useParams<{ customerId: string }>()
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [wallet, setWallet] = useState<WalletSummary | null>(null)
  const [timeline, setTimeline] = useState<WalletEntry[]>([])
  const [error, setError] = useState<string | null>(null)
  const [direction, setDirection] = useState<'credit' | 'debit'>('credit')
  const [amount, setAmount] = useState('')
  const [reference, setReference] = useState('')
  const [note, setNote] = useState('')
  const [method, setMethod] = useState<PaymentMethod | ''>('')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)

  const load = useCallback(() => {
    fetchCustomerWallet(customerId)
      .then((r) => {
        setCustomer(r.customer)
        setWallet(r.wallet)
        setTimeline(r.timeline)
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : t('লোড করা যায়নি', 'Could not load')))
  }, [customerId, t])
  useEffect(load, [load])

  async function submit(e: FormEvent) {
    e.preventDefault()
    const value = Number(amount)
    if (!value) return
    const signed = direction === 'credit' ? value : -value
    if (!window.confirm(t(`${direction === 'credit' ? 'জমা' : 'কাটা'} ${formatBdt(value)} — নিশ্চিত?`, `${direction === 'credit' ? 'Credit' : 'Debit'} ${formatBdt(value)} — sure?`))) return
    setBusy(true)
    setError(null)
    setDone(false)
    try {
      await adjustWallet(customerId, { amount: signed, reference: reference.trim(), note: note.trim() || undefined, method: method || undefined })
      setAmount('')
      setReference('')
      setNote('')
      setDone(true)
      load()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('সমন্বয় করা যায়নি', 'Could not adjust'))
    } finally {
      setBusy(false)
    }
  }

  if (!wallet || !customer) {
    return error ? <div className="admin-card"><p className="pay-note pay-note--err">{error}</p></div> : <div className="skeleton" style={{ height: 300 }} />
  }

  return (
    <section className="admin-page">
      <Link to="/admin/wallets" className="admin-back">
        ← {t('সব ওয়ালেট', 'All wallets')}
      </Link>
      <header className="admin-page__head">
        <div>
          <span className="eyebrow">{t('ওয়ালেট', 'Wallet')}</span>
          <h1>{customer.name}</h1>
          <p className="muted">
            {customer.phone && <a href={`tel:${customer.phone}`}>{customer.phone}</a>} · {customer.email}
          </p>
        </div>
      </header>

      <div className="kpis">
        <div className="kpi">
          <span className="kpi__label">{wallet.owed > 0 ? t('বকেয়া', 'Owes') : t('জমা', 'Credit')}</span>
          <strong className={wallet.owed > 0 ? 'kpi__value tone-warn num' : 'kpi__value tone-gain num'}>{formatBdt(wallet.owed || wallet.credit)}</strong>
        </div>
        <div className="kpi">
          <span className="kpi__label">{t('পরে-পেমেন্টের সীমা', 'Pay-later limit')}</span>
          <strong className="kpi__value num">{formatBdt(wallet.limit)}</strong>
          <span className="muted">
            {t('ডিফল্ট', 'default')} {formatBdt(wallet.baseLimit)}
            {wallet.limit > wallet.baseLimit && ` + ${t('প্রোমো', 'promo')} ${formatBdt(wallet.limit - wallet.baseLimit)}`}
          </span>
        </div>
        <div className="kpi">
          <span className="kpi__label">{t('এখন পরে-পেমেন্টে', 'Can pay later now')}</span>
          <strong className="kpi__value num">{formatBdt(wallet.available)}</strong>
        </div>
      </div>

      <div className="admin-order__grid">
        <section className="admin-card">
          <h2>{t('লেনদেনের ইতিহাস', 'History')}</h2>
          <WalletTimeline entries={timeline} grants={wallet.grants} orderLink={(id) => `/admin/orders/${id}`} />
        </section>

        <aside>
          <section className="admin-card">
            <h2>{t('ওয়ালেট সমন্বয়', 'Adjust wallet')}</h2>
            <p className="muted">
              {t(
                'জমা: গ্রাহক টাকা দিয়েছেন বা ক্ষতিপূরণ। কাটা: টাকা ফেরত দিয়েছেন বা ভুল সংশোধন। সবসময় রেফারেন্স দিন।',
                'Credit: the customer paid, or goodwill. Debit: money paid back, or a correction. Always give a reference.',
              )}
            </p>
            {error && <p className="pay-note pay-note--err">{error}</p>}
            {done && <p className="pay-note pay-note--ok">✓ {t('সমন্বয় হয়েছে', 'Adjusted')}</p>}
            <form className="admin-form admin-form--compact" onSubmit={submit}>
              <div className="seg" role="group" aria-label={t('ধরন', 'Direction')}>
                <button type="button" className="seg__btn" aria-pressed={direction === 'credit'} onClick={() => setDirection('credit')}>
                  ＋ {t('জমা', 'Credit')}
                </button>
                <button type="button" className="seg__btn" aria-pressed={direction === 'debit'} onClick={() => setDirection('debit')}>
                  − {t('কাটা', 'Debit')}
                </button>
              </div>
              <label>
                {t('পরিমাণ (৳)', 'Amount (৳)')}
                <input type="number" min={1} step="any" value={amount} onChange={(e) => setAmount(e.target.value)} required />
              </label>
              <label>
                {t('মাধ্যম (ঐচ্ছিক)', 'Method (optional)')}
                <select value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod | '')}>
                  <option value="">—</option>
                  {paymentMethods.map((m) => (
                    <option key={m} value={m}>
                      {paymentMethodLabel[m]}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                {t('রেফারেন্স', 'Reference')}
                <input value={reference} onChange={(e) => setReference(e.target.value)} required minLength={3} placeholder={t('TrxID, রসিদ নং…', 'TrxID, receipt no…')} />
              </label>
              <label>
                {t('নোট', 'Note')}
                <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} />
              </label>
              <button type="submit" className="btn btn--primary" disabled={busy}>
                {direction === 'credit' ? t('জমা করুন', 'Credit wallet') : t('কাটুন', 'Debit wallet')}
              </button>
            </form>
          </section>
        </aside>
      </div>
    </section>
  )
}

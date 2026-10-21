import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { fetchMyWallet, redeemLimitCode } from '../lib/wallet'
import { formatBdt, formatDateTime } from '../lib/format'
import { ApiError } from '../lib/apiClient'
import { usePoll } from '../lib/usePoll'
import { useI18n } from '../context/LanguageContext'
import { PayToUs } from '../components/PayToUs'
import { ClaimForm } from '../components/ClaimForm'
import { WalletTimeline } from '../components/WalletTimeline'
import type { WalletEntry, WalletSummary } from '../types/payment'
import './Wallet.css'

/// The customer's wallet (vault node: wallet): what they owe or have in credit,
/// their pay-later limit, a way to pay us and report it, limit codes, and the
/// full history as a timeline.
export function Wallet() {
  const { t } = useI18n()
  const [wallet, setWallet] = useState<WalletSummary | null>(null)
  const [timeline, setTimeline] = useState<WalletEntry[]>([])
  const [error, setError] = useState<string | null>(null)
  const [code, setCode] = useState('')
  const [codeMsg, setCodeMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [redeeming, setRedeeming] = useState(false)

  const load = useCallback(() => {
    fetchMyWallet()
      .then((r) => {
        setWallet(r.wallet)
        setTimeline(r.timeline)
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : t('ওয়ালেট লোড করা যায়নি', 'Could not load your wallet')))
  }, [t])
  useEffect(load, [load])
  usePoll(load, 30_000)

  async function redeem(e: FormEvent) {
    e.preventDefault()
    setCodeMsg(null)
    setRedeeming(true)
    try {
      const r = await redeemLimitCode(code.trim())
      setWallet(r.wallet)
      setCode('')
      setCodeMsg({
        ok: true,
        text: t(
          `সীমা ${formatBdt(r.grant.amount)} বেড়েছে, ${formatDateTime(r.grant.expiresAt)} পর্যন্ত।`,
          `Limit raised by ${formatBdt(r.grant.amount)} until ${formatDateTime(r.grant.expiresAt)}.`,
        ),
      })
      load()
    } catch (err) {
      setCodeMsg({ ok: false, text: err instanceof ApiError ? err.message : t('কোডটি কাজ করেনি', "That code didn't work") })
    } finally {
      setRedeeming(false)
    }
  }

  if (error) return <div className="card"><p className="pay-note pay-note--err">{error}</p></div>
  if (!wallet) {
    return (
      <div className="wallet">
        <div className="skeleton" style={{ height: 180 }} />
        <div className="skeleton" style={{ height: 320 }} />
      </div>
    )
  }

  const usedPct = wallet.limit > 0 ? Math.min(100, (wallet.owed / wallet.limit) * 100) : 0
  const state = wallet.owed > 0 ? 'owe' : wallet.credit > 0 ? 'credit' : 'clear'

  return (
    <div className="wallet">
      <header className="wallet__head">
        <span className="eyebrow">{t('আমার ওয়ালেট', 'My wallet')}</span>
        <h1>{t('ওয়ালেট', 'Wallet')}</h1>
      </header>

      {/* Balance */}
      <section className={`card wallet-balance wallet-balance--${state}`} aria-live="polite">
        <div className="wallet-balance__main">
          <span className="wallet-balance__label">
            {state === 'owe' ? t('আপনার বকেয়া', 'You owe') : state === 'credit' ? t('আপনার জমা', 'Your credit') : t('ব্যালেন্স', 'Balance')}
          </span>
          <strong className="wallet-balance__amount num">
            {formatBdt(state === 'owe' ? wallet.owed : wallet.credit)}
          </strong>
          <span className="muted">
            {state === 'owe'
              ? t('নিচের অ্যাকাউন্টে পরিশোধ করে রেফারেন্স জমা দিন।', 'Pay to one of the accounts below and submit the reference.')
              : state === 'credit'
                ? t('পরের অর্ডারে নিজে থেকেই কাজে লাগবে।', 'It is used automatically on your next order.')
                : t('সব পরিশোধিত। ধন্যবাদ!', 'All settled. Thank you!')}
          </span>
          {wallet.pendingClaims.count > 0 && (
            <span className="status status--pending">
              {t(
                `${wallet.pendingClaims.count}টি পেমেন্ট (${formatBdt(wallet.pendingClaims.amount)}) যাচাইয়ের অপেক্ষায়`,
                `${wallet.pendingClaims.count} payment(s) (${formatBdt(wallet.pendingClaims.amount)}) awaiting review`,
              )}
            </span>
          )}
        </div>
        <div className="wallet-balance__limit">
          <div className="wallet-balance__limit-row">
            <span>{t('পরে পেমেন্টের সীমা', 'Pay-later limit')}</span>
            <strong className="num">{formatBdt(wallet.limit)}</strong>
          </div>
          <div className="progress" role="img" aria-label={t(`সীমার ${Math.round(usedPct)}% ব্যবহৃত`, `${Math.round(usedPct)}% of the limit used`)}>
            <span className="progress__fill" style={{ transform: `scaleX(${usedPct / 100})` }} />
          </div>
          <div className="wallet-balance__limit-row muted">
            <span>{t('এখন পরে-পেমেন্টে অর্ডার করা যাবে', 'You can pay later for up to')}</span>
            <strong className="num">{formatBdt(wallet.available)}</strong>
          </div>
          {wallet.grants.some((g) => g.active) && (
            <p className="muted wallet-balance__grants">
              {wallet.grants
                .filter((g) => g.active)
                .map((g) => t(`+${formatBdt(g.amount)} (${g.code}) ${formatDateTime(g.expiresAt)} পর্যন্ত`, `+${formatBdt(g.amount)} (${g.code}) until ${formatDateTime(g.expiresAt)}`))
                .join(' · ')}
            </p>
          )}
        </div>
      </section>

      <div className="wallet__grid">
        {/* Pay us */}
        <section className="card">
          <h2>{t('পেমেন্ট করুন', 'Make a payment')}</h2>
          <p className="muted">
            {t(
              'বকেয়া পরিশোধ বা আগাম জমা দিতে পারেন। অ্যাডমিন যাচাই করলে ওয়ালেটে যোগ হবে।',
              'Pay what you owe or add credit in advance. It is added to your wallet once an admin confirms it.',
            )}
          </p>
          <PayToUs amount={wallet.owed || undefined} />
          <ClaimForm defaultAmount={wallet.owed || undefined} onSubmitted={load} />
        </section>

        {/* Limit code */}
        <section className="card wallet__code">
          <h2>{t('প্রোমো কোড', 'Promo code')}</h2>
          <p className="muted">
            {t('কোড দিলে কিছুদিনের জন্য পরে-পেমেন্টের সীমা বাড়বে।', 'A code raises your pay-later limit for a while.')}
          </p>
          <form className="wallet__code-form" onSubmit={redeem}>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder={t('কোড লিখুন', 'Enter code')}
              aria-label={t('প্রোমো কোড', 'Promo code')}
              required
              minLength={2}
              maxLength={40}
            />
            <button type="submit" className="btn btn--soft" disabled={redeeming}>
              {redeeming ? t('যাচাই হচ্ছে…', 'Checking…') : t('ব্যবহার করুন', 'Apply')}
            </button>
          </form>
          {codeMsg && <p className={codeMsg.ok ? 'pay-note pay-note--ok' : 'pay-note pay-note--err'}>{codeMsg.text}</p>}

          <h3 className="wallet__how-title">{t('কীভাবে কাজ করে', 'How it works')}</h3>
          <ul className="wallet__how">
            <li>
              <strong>{t('আগে পেমেন্ট', 'Pay first')}</strong> — {t('পরিশোধ নিশ্চিত হলে অর্ডার নিশ্চিত হয়।', 'your order confirms once payment is verified.')}
            </li>
            <li>
              <strong>{t('পরে পেমেন্ট', 'Pay later')}</strong> — {t('সীমার মধ্যে অর্ডার সাথে সাথে ওয়ালেটে যোগ হয়।', 'within your limit, the order is added to your wallet at once.')}
            </li>
            <li>
              <strong>{t('ক্যাশ অন ডেলিভারি', 'Cash on delivery')}</strong> — {t('ডেলিভারির সময় নগদে পরিশোধ।', 'pay in cash at your door.')}
            </li>
          </ul>
        </section>
      </div>

      <section className="card">
        <h2>{t('লেনদেনের ইতিহাস', 'History')}</h2>
        <WalletTimeline entries={timeline} grants={wallet.grants} />
      </section>
    </div>
  )
}

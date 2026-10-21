import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchPendingClaims, fetchWallets, reviewClaim } from '../../lib/wallet'
import { formatBdt, formatDateTime } from '../../lib/format'
import { paymentMethodLabel } from '../../lib/paymentLabels'
import { ApiError } from '../../lib/apiClient'
import { usePoll } from '../../lib/usePoll'
import { useI18n } from '../../context/LanguageContext'
import type { PendingClaim, WalletRow, WalletTotals } from '../../types/payment'
import './Admin.css'

/// Wallets (vault node: wallet). The payment claims customers reported come
/// first, as a review queue; then totals and every customer's wallet, most owed
/// first.
export function WalletsAdmin() {
  const { t } = useI18n()
  const [claims, setClaims] = useState<PendingClaim[] | null>(null)
  const [wallets, setWallets] = useState<WalletRow[] | null>(null)
  const [totals, setTotals] = useState<WalletTotals | null>(null)
  const [search, setSearch] = useState('')
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(() => {
    fetchPendingClaims()
      .then(setClaims)
      .catch(() => setClaims([]))
    fetchWallets(search.trim() || undefined)
      .then((r) => {
        setWallets(r.wallets)
        setTotals(r.totals)
      })
      .catch(() => setWallets([]))
  }, [search])

  useEffect(() => {
    const id = window.setTimeout(load, 250)
    return () => window.clearTimeout(id)
  }, [load])
  usePoll(load, 20_000)

  async function review(claim: PendingClaim, action: 'confirm' | 'reject') {
    const note = action === 'reject' ? window.prompt(t('বাতিলের কারণ লিখুন (গ্রাহক দেখবেন)', 'Reason for rejecting (the customer sees it)')) ?? '' : undefined
    if (action === 'reject' && !note) return
    setBusyId(claim.id)
    setError(null)
    try {
      await reviewClaim(claim.id, action, note)
      load()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('কাজটি করা যায়নি', 'Could not complete that'))
    } finally {
      setBusyId(null)
    }
  }

  return (
    <section className="admin-page">
      <header className="admin-page__head">
        <div>
          <span className="eyebrow">{t('টাকা', 'Money')}</span>
          <h1>{t('ওয়ালেট', 'Wallets')}</h1>
        </div>
      </header>
      {error && <p className="pay-note pay-note--err">{error}</p>}

      {totals && (
        <div className="kpis">
          <div className="kpi">
            <span className="kpi__label">{t('মোট বকেয়া', 'Owed to us')}</span>
            <strong className="kpi__value tone-warn num">{formatBdt(totals.owed)}</strong>
          </div>
          <div className="kpi">
            <span className="kpi__label">{t('গ্রাহকদের জমা', 'Customer credit')}</span>
            <strong className="kpi__value num">{formatBdt(totals.credit)}</strong>
          </div>
          <div className="kpi">
            <span className="kpi__label">{t('যাচাইয়ের অপেক্ষায়', 'Awaiting review')}</span>
            <strong className="kpi__value num">
              {totals.pendingClaims} · {formatBdt(totals.pendingAmount)}
            </strong>
          </div>
        </div>
      )}

      <section className="admin-card">
        <div className="admin-card__head">
          <h2>{t('পেমেন্ট যাচাই', 'Payments to review')}</h2>
          {claims && claims.length > 0 && <span className="status status--pending">{claims.length}</span>}
        </div>
        {claims == null ? (
          <div className="skeleton" style={{ height: 80 }} />
        ) : claims.length === 0 ? (
          <p className="muted">✓ {t('কিছু যাচাই বাকি নেই।', 'Nothing to review.')}</p>
        ) : (
          <ul className="claim-queue">
            {claims.map((c) => (
              <li key={c.id} className="claim-queue__item">
                <div className="claim-queue__who">
                  <strong>{c.customer.name}</strong>
                  {c.customer.phone && <span className="muted"> · {c.customer.phone}</span>}
                  <span className="muted">
                    {' '}
                    · {formatDateTime(c.createdAt)}
                    {c.orderNumber && c.orderId && (
                      <>
                        {' '}
                        · <Link to={`/admin/orders/${c.orderId}`}>{c.orderNumber}</Link>
                      </>
                    )}
                  </span>
                </div>
                <div className="claim-queue__what">
                  <strong className="num">{formatBdt(c.amount)}</strong>
                  <span>{c.method ? paymentMethodLabel[c.method] : ''}</span>
                  <span className="claim-queue__ref num">{c.reference}</span>
                  {c.note && <span className="muted">“{c.note}”</span>}
                </div>
                <div className="claim-queue__actions">
                  <button type="button" className="btn btn--primary btn--sm" disabled={busyId === c.id} onClick={() => review(c, 'confirm')}>
                    ✓ {t('নিশ্চিত', 'Confirm')}
                  </button>
                  <button type="button" className="btn btn--danger btn--sm" disabled={busyId === c.id} onClick={() => review(c, 'reject')}>
                    ✕ {t('বাতিল', 'Reject')}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="admin-card">
        <div className="admin-card__head">
          <h2>{t('সব ওয়ালেট', 'All wallets')}</h2>
          <input
            type="search"
            className="admin-search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('নাম, ইমেইল বা ফোন', 'Name, email or phone')}
            aria-label={t('ওয়ালেট খুঁজুন', 'Search wallets')}
          />
        </div>
        {wallets == null ? (
          <div className="skeleton" style={{ height: 160 }} />
        ) : (
          <div className="table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>{t('গ্রাহক', 'Customer')}</th>
                  <th className="num">{t('ব্যালেন্স', 'Balance')}</th>
                  <th className="num">{t('সীমা', 'Limit')}</th>
                  <th>{t('অপেক্ষমাণ', 'Pending')}</th>
                  <th>{t('শেষ লেনদেন', 'Last activity')}</th>
                </tr>
              </thead>
              <tbody>
                {wallets.map((w) => (
                  <tr key={w.customerId}>
                    <td>
                      <Link to={`/admin/wallets/${w.customerId}`}>
                        <strong>{w.name}</strong>
                      </Link>
                      <br />
                      <span className="muted">{w.phone ?? w.email}</span>
                    </td>
                    <td className={w.balance < 0 ? 'num tone-warn' : w.balance > 0 ? 'num tone-gain' : 'num'}>
                      {w.balance < 0 ? `${t('বকেয়া', 'owes')} ${formatBdt(-w.balance)}` : w.balance > 0 ? `${t('জমা', 'credit')} ${formatBdt(w.balance)}` : formatBdt(0)}
                    </td>
                    <td className="num">{formatBdt(w.limit)}</td>
                    <td>{w.pendingClaims > 0 ? <span className="status status--pending">{w.pendingClaims}</span> : <span className="muted">—</span>}</td>
                    <td className="muted">{w.lastActivity ? formatDateTime(w.lastActivity) : '—'}</td>
                  </tr>
                ))}
                {wallets.length === 0 && (
                  <tr>
                    <td colSpan={5} className="muted">
                      {t('কোনো ওয়ালেট পাওয়া যায়নি।', 'No wallets found.')}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </section>
  )
}

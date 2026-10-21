import { Link } from 'react-router-dom'
import { entryIcon, entryStatusLabel, entryTypeLabel, paymentMethodLabel } from '../lib/paymentLabels'
import { formatBdt, formatDateTime } from '../lib/format'
import { useI18n } from '../context/LanguageContext'
import type { LimitGrant, WalletEntry } from '../types/payment'
import './Pay.css'

type Item = { kind: 'entry'; at: string; entry: WalletEntry } | { kind: 'grant'; at: string; grant: LimitGrant }

const statusClass: Record<WalletEntry['status'], string> = {
  PENDING: 'status status--pending',
  CONFIRMED: 'status status--delivered',
  REJECTED: 'status status--cancelled',
}

/// The wallet history as a timeline, newest first: charges, payments, refunds,
/// adjustments and limit raises, each with its reference and the balance after.
export function WalletTimeline({
  entries,
  grants = [],
  orderLink = (id) => `/orders/${id}`,
}: {
  entries: WalletEntry[]
  grants?: LimitGrant[]
  orderLink?: (orderId: string) => string
}) {
  const { t } = useI18n()
  const items: Item[] = [
    ...entries.map((entry) => ({ kind: 'entry' as const, at: entry.createdAt, entry })),
    ...grants.map((grant) => ({ kind: 'grant' as const, at: grant.createdAt, grant })),
  ].sort((a, b) => b.at.localeCompare(a.at))

  if (!items.length) {
    return <p className="muted">{t('এখনো কোনো লেনদেন নেই।', 'No activity yet.')}</p>
  }

  return (
    <ol className="wallet-timeline">
      {items.map((item) => {
        if (item.kind === 'grant') {
          const g = item.grant
          return (
            <li key={`g-${g.id}`} className="wallet-timeline__item">
              <span className="wallet-timeline__icon" aria-hidden="true">
                ⬆
              </span>
              <div className="wallet-timeline__body">
                <strong>
                  {t('সীমা বেড়েছে', 'Limit raised')} +{formatBdt(g.amount)}
                </strong>
                <span className="muted">
                  {t('কোড', 'Code')} {g.code} · {g.active ? t('মেয়াদ', 'until') : t('শেষ হয়েছে', 'ended')} {formatDateTime(g.expiresAt)}
                </span>
              </div>
              <span className="wallet-timeline__when muted">{formatDateTime(g.createdAt)}</span>
            </li>
          )
        }
        const e = item.entry
        const counted = e.status === 'CONFIRMED'
        return (
          <li key={e.id} className={counted ? 'wallet-timeline__item' : 'wallet-timeline__item wallet-timeline__item--muted'}>
            <span className="wallet-timeline__icon" aria-hidden="true">
              {entryIcon[e.type]}
            </span>
            <div className="wallet-timeline__body">
              <strong>
                {entryTypeLabel[e.type]}
                {e.orderId && e.orderNumber && (
                  <>
                    {' '}
                    <Link to={orderLink(e.orderId)}>{e.orderNumber}</Link>
                  </>
                )}
              </strong>
              <span className="muted">
                {e.method && <>{paymentMethodLabel[e.method]} · </>}
                {e.reference && <>{t('রেফ', 'Ref')} {e.reference} · </>}
                {e.note && <>{e.note} · </>}
                {e.createdByName && <>{t('দ্বারা', 'by')} {e.createdByName}</>}
              </span>
              {e.status !== 'CONFIRMED' && (
                <span>
                  <span className={statusClass[e.status]}>{entryStatusLabel[e.status]}</span>
                  {e.reviewNote && <span className="muted"> · {e.reviewNote}</span>}
                </span>
              )}
            </div>
            <div className="wallet-timeline__money">
              <span className={e.amount >= 0 ? 'wallet-timeline__amount tone-gain num' : 'wallet-timeline__amount num'}>
                {e.amount >= 0 ? '+' : '−'}
                {formatBdt(Math.abs(e.amount))}
              </span>
              {e.balanceAfter != null && (
                <span className="wallet-timeline__balance muted num">
                  {t('ব্যালেন্স', 'Balance')} {e.balanceAfter < 0 ? '−' : ''}
                  {formatBdt(Math.abs(e.balanceAfter))}
                </span>
              )}
              <span className="wallet-timeline__when muted">{formatDateTime(e.createdAt)}</span>
            </div>
          </li>
        )
      })}
    </ol>
  )
}

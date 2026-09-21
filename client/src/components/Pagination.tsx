import { localeDigits } from '../lib/i18n'
import { useI18n } from '../context/LanguageContext'
import './Pagination.css'

interface PaginationProps {
  page: number // 1-indexed
  pageCount: number
  onChange: (page: number) => void
}

/// Builds a compact page list with ellipses, e.g. 1 … 4 5 [6] 7 8 … 20.
function pageWindow(page: number, pageCount: number): (number | '…')[] {
  if (pageCount <= 7) return Array.from({ length: pageCount }, (_, i) => i + 1)
  const out: (number | '…')[] = [1]
  const start = Math.max(2, page - 1)
  const end = Math.min(pageCount - 1, page + 1)
  if (start > 2) out.push('…')
  for (let i = start; i <= end; i++) out.push(i)
  if (end < pageCount - 1) out.push('…')
  out.push(pageCount)
  return out
}

export function Pagination({ page, pageCount, onChange }: PaginationProps) {
  const { t } = useI18n()
  if (pageCount <= 1) return null
  const items = pageWindow(page, pageCount)

  return (
    <nav className="pagination" aria-label={t('পৃষ্ঠা নেভিগেশন', 'Pagination')}>
      <button
        className="pagination__btn"
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
        aria-label={t('আগের পৃষ্ঠা', 'Previous page')}
      >
        ←
      </button>
      {items.map((it, i) =>
        it === '…' ? (
          <span key={`gap-${i}`} className="pagination__gap">
            …
          </span>
        ) : (
          <button
            key={it}
            className={it === page ? 'pagination__btn pagination__btn--active' : 'pagination__btn'}
            aria-current={it === page ? 'page' : undefined}
            onClick={() => onChange(it)}
          >
            {localeDigits(it)}
          </button>
        ),
      )}
      <button
        className="pagination__btn"
        disabled={page >= pageCount}
        onClick={() => onChange(page + 1)}
        aria-label={t('পরের পৃষ্ঠা', 'Next page')}
      >
        →
      </button>
    </nav>
  )
}

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchCosting } from '../../lib/inventory'
import { formatBdt } from '../../lib/format'
import { useI18n } from '../../context/LanguageContext'
import type { CostingRow } from '../../types/inventory'
import './Admin.css'

export function CostingAdmin() {
  const { t } = useI18n()
  const [rows, setRows] = useState<CostingRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchCosting()
      .then(setRows)
      .finally(() => setLoading(false))
  }, [])

  return (
    <section>
      <h1>{t('প্রোডাক্ট কস্টিং', 'Product costing')}</h1>
      <p className="muted">{t('রেসিপি ও উপকরণের গড় খরচ থেকে প্রতি ইউনিট খরচ ও মার্জিন।', 'Per-unit cost and margin from recipes and average material costs.')}</p>

      {loading ? (
        <p className="muted">{t('লোড হচ্ছে…', 'Loading…')}</p>
      ) : (
        <div className="table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>{t('পণ্য', 'Product')}</th>
                <th>{t('বিক্রয় মূল্য', 'Selling price')}</th>
                <th>{t('প্রতি ইউনিট খরচ', 'Cost per unit')}</th>
                <th>{t('গ্রস প্রফিট', 'Gross profit')}</th>
                <th>{t('মার্জিন', 'Margin')}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.productId}>
                  <td>{r.productName}</td>
                  <td>{formatBdt(r.sellingPrice)}</td>
                  <td>{r.costPerUnit != null ? formatBdt(r.costPerUnit) : <span className="muted">{t('রেসিপি নেই', 'No recipe')}</span>}</td>
                  <td>{r.grossProfitPerUnit != null ? formatBdt(r.grossProfitPerUnit) : '—'}</td>
                  <td>
                    {r.marginPct != null ? (
                      <span style={{ color: r.marginPct >= 0 ? '#b07d10' : '#b3261e' }}>{r.marginPct.toFixed(1)}%</span>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="admin-table__actions">
                    <Link className="btn-ghost" to={`/admin/products/${r.productId}/recipe`}>
                      {t('রেসিপি', 'Recipe')}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

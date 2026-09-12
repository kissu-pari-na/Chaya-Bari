import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchCosting } from '../../lib/inventory'
import { formatBdt } from '../../lib/format'
import type { CostingRow } from '../../types/inventory'
import './Admin.css'

export function CostingAdmin() {
  const [rows, setRows] = useState<CostingRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchCosting()
      .then(setRows)
      .finally(() => setLoading(false))
  }, [])

  return (
    <section>
      <h1>প্রোডাক্ট কস্টিং</h1>
      <p className="muted">রেসিপি ও উপকরণের গড় খরচ থেকে প্রতি ইউনিট খরচ ও মার্জিন।</p>

      {loading ? (
        <p className="muted">লোড হচ্ছে…</p>
      ) : (
        <div className="table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>পণ্য</th>
                <th>বিক্রয় মূল্য</th>
                <th>প্রতি ইউনিট খরচ</th>
                <th>গ্রস প্রফিট</th>
                <th>মার্জিন</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.productId}>
                  <td>{r.productName}</td>
                  <td>{formatBdt(r.sellingPrice)}</td>
                  <td>{r.costPerUnit != null ? formatBdt(r.costPerUnit) : <span className="muted">রেসিপি নেই</span>}</td>
                  <td>{r.grossProfitPerUnit != null ? formatBdt(r.grossProfitPerUnit) : '—'}</td>
                  <td>
                    {r.marginPct != null ? (
                      <span style={{ color: r.marginPct >= 0 ? '#1a7a45' : '#b3261e' }}>{r.marginPct.toFixed(1)}%</span>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="admin-table__actions">
                    <Link className="btn-ghost" to={`/admin/products/${r.productId}/recipe`}>
                      রেসিপি
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

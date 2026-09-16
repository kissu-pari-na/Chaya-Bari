import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchDeliveries } from '../../lib/delivery'
import { deliveryStatusLabel } from '../../lib/deliveryStatus'
import { formatBdt } from '../../lib/format'
import { formatSlotValue } from '../../lib/slots'
import { useI18n } from '../../context/LanguageContext'
import type { DeliveryListRow } from '../../types/delivery'
import '../Orders.css'
import './Admin.css'

export function DeliveriesAdmin() {
  const { t } = useI18n()
  const [rows, setRows] = useState<DeliveryListRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDeliveries()
      .then(setRows)
      .finally(() => setLoading(false))
  }, [])

  const totals = rows.reduce(
    (acc, r) => {
      acc.customer += r.customerDeliveryCost
      if (r.actualDeliveryCost != null) acc.actual += r.actualDeliveryCost
      if (r.difference != null) acc.difference += r.difference
      return acc
    },
    { customer: 0, actual: 0, difference: 0 },
  )

  return (
    <section>
      <h1>{t('ডেলিভারি ব্যবস্থাপনা', 'Delivery management')}</h1>

      {loading ? (
        <p className="muted">{t('লোড হচ্ছে…', 'Loading…')}</p>
      ) : (
        <>
          <div className="stat-row">
            <div className="stat">
              <span className="stat__label">{t('কাস্টমার খরচ (মোট)', 'Customer cost (total)')}</span>
              <span className="stat__value">{formatBdt(totals.customer)}</span>
            </div>
            <div className="stat">
              <span className="stat__label">{t('প্রকৃত খরচ (মোট)', 'Actual cost (total)')}</span>
              <span className="stat__value">{formatBdt(totals.actual)}</span>
            </div>
            <div className="stat">
              <span className="stat__label">{t('ডেলিভারি লাভ/ক্ষতি', 'Delivery gain/loss')}</span>
              <span className="stat__value" style={{ color: totals.difference >= 0 ? '#b07d10' : '#b3261e' }}>
                {totals.difference >= 0 ? '+' : '−'}
                {formatBdt(Math.abs(totals.difference))}
              </span>
            </div>
          </div>

          <div className="table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>{t('অর্ডার', 'Order')}</th>
                  <th>{t('তারিখ', 'Date')}</th>
                  <th>{t('প্রোভাইডার', 'Provider')}</th>
                  <th>{t('কাস্টমার', 'Customer')}</th>
                  <th>{t('প্রকৃত', 'Actual')}</th>
                  <th>{t('পার্থক্য', 'Difference')}</th>
                  <th>{t('স্ট্যাটাস', 'Status')}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <Link to={`/admin/orders/${r.orderId}`}>{r.orderNumber}</Link>
                    </td>
                    <td>
                      {r.fulfillmentDate}
                      {r.timeSlot && <><br /><span className="muted">{formatSlotValue(r.timeSlot)}</span></>}
                    </td>
                    <td>{r.provider ?? '—'}</td>
                    <td>{formatBdt(r.customerDeliveryCost)}</td>
                    <td>{r.actualDeliveryCost != null ? formatBdt(r.actualDeliveryCost) : '—'}</td>
                    <td>
                      {r.difference == null ? (
                        <span className="muted">{t('অসম্পূর্ণ', 'Incomplete')}</span>
                      ) : (
                        <span style={{ color: r.difference >= 0 ? '#b07d10' : '#b3261e' }}>
                          {r.difference >= 0 ? '+' : '−'}
                          {formatBdt(Math.abs(r.difference))}
                        </span>
                      )}
                    </td>
                    <td>
                      <span className="status status--payment">{deliveryStatusLabel[r.status]}</span>
                    </td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={7} className="muted">
                      {t('কোনো ডেলিভারি নেই।', 'No deliveries.')}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  )
}

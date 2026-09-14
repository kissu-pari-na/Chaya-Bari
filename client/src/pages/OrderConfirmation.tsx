import { useBusinessProfile } from '../context/BusinessProfileContext'
import { useI18n } from '../context/LanguageContext'
import { DocumentHeader } from '../components/DocumentHeader'
import './Document.css'

export function OrderConfirmation() {
  const { profile } = useBusinessProfile()
  const { t } = useI18n()

  const sampleOrder = {
    id: 'CB-100234',
    date: '2026-09-11',
    customerName: t('রহিম উদ্দিন', 'Rahim Uddin'),
    items: [
      { name: t('বিরিয়ানি (১ প্লেট)', 'Biryani (1 plate)'), qty: 2, price: 220 },
      { name: t('বোরহানি', 'Borhani'), qty: 1, price: 40 },
    ],
  }
  const total = sampleOrder.items.reduce((sum, item) => sum + item.qty * item.price, 0)

  return (
    <section className="paper document">
      <DocumentHeader />
      <h1>{t('অর্ডার কনফার্মেশন', 'Order Confirmation')}</h1>
      <p>
        {t('ধন্যবাদ,', 'Thank you,')} {sampleOrder.customerName}!{' '}
        {t(`${profile.name}-এ আপনার অর্ডারটি নিশ্চিত হয়েছে।`, `Your order at ${profile.name} has been confirmed.`)}
      </p>
      <table className="document-table">
        <thead>
          <tr>
            <th>{t('আইটেম', 'Item')}</th>
            <th>{t('পরিমাণ', 'Qty')}</th>
            <th>{t('মূল্য', 'Price')}</th>
          </tr>
        </thead>
        <tbody>
          {sampleOrder.items.map((item) => (
            <tr key={item.name}>
              <td>{item.name}</td>
              <td>{item.qty}</td>
              <td>
                {item.qty * item.price} {profile.defaultSettings.currency}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={2}>{t('মোট', 'Total')}</td>
            <td>
              {total} {profile.defaultSettings.currency}
            </td>
          </tr>
        </tfoot>
      </table>
      <p className="muted">
        {t('অর্ডার নম্বর:', 'Order no:')} {sampleOrder.id} · {t('তারিখ:', 'Date:')} {sampleOrder.date}
      </p>
    </section>
  )
}

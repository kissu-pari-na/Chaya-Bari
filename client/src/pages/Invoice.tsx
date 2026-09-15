import { useBusinessProfile } from '../context/BusinessProfileContext'
import { useI18n } from '../context/LanguageContext'
import { useContentLang } from '../context/TranslationContext'
import { DocumentHeader } from '../components/DocumentHeader'
import './Document.css'

export function Invoice() {
  const { profile } = useBusinessProfile()
  const { t } = useI18n()
  const { lc } = useContentLang()
  const bizName = lc(profile.name, profile.nameEnglish)

  const sampleInvoice = {
    id: 'INV-100234',
    date: '2026-09-11',
    customerName: t('রহিম উদ্দিন', 'Rahim Uddin'),
    items: [
      { name: t('বিরিয়ানি (১ প্লেট)', 'Biryani (1 plate)'), qty: 2, price: 220 },
      { name: t('বোরহানি', 'Borhani'), qty: 1, price: 40 },
    ],
    deliveryFee: 30,
  }
  const subtotal = sampleInvoice.items.reduce((sum, item) => sum + item.qty * item.price, 0)
  const total = subtotal + sampleInvoice.deliveryFee

  return (
    <section className="paper document">
      <DocumentHeader />
      <h1>{t('ইনভয়েস / রিসিপ্ট', 'Invoice / Receipt')}</h1>
      <p className="muted">
        {t('ইনভয়েস নম্বর:', 'Invoice no:')} {sampleInvoice.id} · {t('তারিখ:', 'Date:')} {sampleInvoice.date} · {t('গ্রাহক:', 'Customer:')} {sampleInvoice.customerName}
      </p>
      <table className="document-table">
        <thead>
          <tr>
            <th>{t('আইটেম', 'Item')}</th>
            <th>{t('পরিমাণ', 'Qty')}</th>
            <th>{t('একক মূল্য', 'Unit price')}</th>
            <th>{t('মোট', 'Total')}</th>
          </tr>
        </thead>
        <tbody>
          {sampleInvoice.items.map((item) => (
            <tr key={item.name}>
              <td>{item.name}</td>
              <td>{item.qty}</td>
              <td>
                {item.price} {profile.defaultSettings.currency}
              </td>
              <td>
                {item.qty * item.price} {profile.defaultSettings.currency}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={3}>{t('সাবটোটাল', 'Subtotal')}</td>
            <td>
              {subtotal} {profile.defaultSettings.currency}
            </td>
          </tr>
          <tr>
            <td colSpan={3}>{t('ডেলিভারি ফি', 'Delivery fee')}</td>
            <td>
              {sampleInvoice.deliveryFee} {profile.defaultSettings.currency}
            </td>
          </tr>
          <tr>
            <td colSpan={3}>{t('সর্বমোট', 'Grand total')}</td>
            <td>
              <strong>
                {total} {profile.defaultSettings.currency}
              </strong>
            </td>
          </tr>
        </tfoot>
      </table>
      <p className="muted small">
        {t(`এই ইনভয়েসটি ${bizName} কর্তৃক প্রদত্ত। কোনো প্রশ্ন থাকলে ${profile.contact.phone} নম্বরে যোগাযোগ করুন।`, `This invoice is issued by ${bizName}. For any questions, contact ${profile.contact.phone}.`)}
      </p>
    </section>
  )
}

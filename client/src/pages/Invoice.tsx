import { useBusinessProfile } from '../context/BusinessProfileContext'
import { DocumentHeader } from '../components/DocumentHeader'
import './Document.css'

const sampleInvoice = {
  id: 'INV-100234',
  date: '2026-09-11',
  customerName: 'রহিম উদ্দিন',
  items: [
    { name: 'বিরিয়ানি (১ প্লেট)', qty: 2, price: 220 },
    { name: 'বোরহানি', qty: 1, price: 40 },
  ],
  deliveryFee: 30,
}

export function Invoice() {
  const { profile } = useBusinessProfile()
  const subtotal = sampleInvoice.items.reduce((sum, item) => sum + item.qty * item.price, 0)
  const total = subtotal + sampleInvoice.deliveryFee

  return (
    <section className="paper document">
      <DocumentHeader />
      <h1>ইনভয়েস / রিসিপ্ট</h1>
      <p className="muted">
        ইনভয়েস নম্বর: {sampleInvoice.id} · তারিখ: {sampleInvoice.date} · গ্রাহক: {sampleInvoice.customerName}
      </p>
      <table className="document-table">
        <thead>
          <tr>
            <th>আইটেম</th>
            <th>পরিমাণ</th>
            <th>একক মূল্য</th>
            <th>মোট</th>
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
            <td colSpan={3}>সাবটোটাল</td>
            <td>
              {subtotal} {profile.defaultSettings.currency}
            </td>
          </tr>
          <tr>
            <td colSpan={3}>ডেলিভারি ফি</td>
            <td>
              {sampleInvoice.deliveryFee} {profile.defaultSettings.currency}
            </td>
          </tr>
          <tr>
            <td colSpan={3}>সর্বমোট</td>
            <td>
              <strong>
                {total} {profile.defaultSettings.currency}
              </strong>
            </td>
          </tr>
        </tfoot>
      </table>
      <p className="muted small">
        এই ইনভয়েসটি {profile.name} কর্তৃক প্রদত্ত। কোনো প্রশ্ন থাকলে {profile.contact.phone} নম্বরে যোগাযোগ করুন।
      </p>
    </section>
  )
}

import { useBusinessProfile } from '../context/BusinessProfileContext'
import { DocumentHeader } from '../components/DocumentHeader'
import './Document.css'

const sampleOrder = {
  id: 'CB-100234',
  date: '2026-09-11',
  customerName: 'রহিম উদ্দিন',
  items: [
    { name: 'বিরিয়ানি (১ প্লেট)', qty: 2, price: 220 },
    { name: 'বোরহানি', qty: 1, price: 40 },
  ],
}

export function OrderConfirmation() {
  const { profile } = useBusinessProfile()
  const total = sampleOrder.items.reduce((sum, item) => sum + item.qty * item.price, 0)

  return (
    <section className="paper document">
      <DocumentHeader />
      <h1>অর্ডার কনফার্মেশন</h1>
      <p>
        ধন্যবাদ, {sampleOrder.customerName}! {profile.name}-এ আপনার অর্ডারটি নিশ্চিত হয়েছে।
      </p>
      <table className="document-table">
        <thead>
          <tr>
            <th>আইটেম</th>
            <th>পরিমাণ</th>
            <th>মূল্য</th>
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
            <td colSpan={2}>মোট</td>
            <td>
              {total} {profile.defaultSettings.currency}
            </td>
          </tr>
        </tfoot>
      </table>
      <p className="muted">
        অর্ডার নম্বর: {sampleOrder.id} · তারিখ: {sampleOrder.date}
      </p>
    </section>
  )
}

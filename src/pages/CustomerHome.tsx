import { Link } from 'react-router-dom'
import { useBusinessProfile } from '../context/BusinessProfileContext'

export function CustomerHome() {
  const { profile } = useBusinessProfile()

  return (
    <section className="card">
      <h1>{profile.name}-এ স্বাগতম</h1>
      {profile.tagline && <p className="muted">{profile.tagline}</p>}
      <p>
        আমরা {profile.address.city}, {profile.address.country}-এ সেবা প্রদান করি।
      </p>
      <div className="sample-links">
        <Link to="/order-confirmation">অর্ডার কনফার্মেশন দেখুন</Link>
        <Link to="/invoice">ইনভয়েস দেখুন</Link>
      </div>
    </section>
  )
}

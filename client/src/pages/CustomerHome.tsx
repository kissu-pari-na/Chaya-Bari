import { Link } from 'react-router-dom'
import { useBusinessProfile } from '../context/BusinessProfileContext'
import { useAuth } from '../context/AuthContext'

export function CustomerHome() {
  const { profile } = useBusinessProfile()
  const { user } = useAuth()

  return (
    <section className="card">
      <h1>{profile.name}-এ স্বাগতম</h1>
      {profile.tagline && <p className="muted">{profile.tagline}</p>}
      <p>
        আমরা {profile.address.city}, {profile.address.country}-এ সেবা প্রদান করি।
      </p>

      {user ? (
        <p>স্বাগতম, <strong>{user.name}</strong>! পণ্য ব্রাউজিং ও অর্ডার শীঘ্রই যুক্ত হবে।</p>
      ) : (
        <div className="sample-links">
          <Link to="/login">লগইন</Link>
          <Link to="/register">রেজিস্টার করুন</Link>
        </div>
      )}

      <div className="sample-links">
        <Link to="/order-confirmation">অর্ডার কনফার্মেশন (নমুনা)</Link>
        <Link to="/invoice">ইনভয়েস (নমুনা)</Link>
      </div>
    </section>
  )
}

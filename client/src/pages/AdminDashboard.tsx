import { Link } from 'react-router-dom'
import { useBusinessProfile } from '../context/BusinessProfileContext'

export function AdminDashboard() {
  const { profile } = useBusinessProfile()
  const owners = profile.partners.filter((p) => p.applicationRole === 'business_owner_admin')

  return (
    <section className="card">
      <h1>{profile.name} — অ্যাডমিন ড্যাশবোর্ড</h1>
      <p className="muted">এখানে ব্যবসার সার্বিক তথ্য দেখা যাবে।</p>

      <div className="stat-row">
        <div className="stat">
          <span className="stat__label">বিজনেস পার্টনার</span>
          <span className="stat__value">{profile.partners.length}</span>
        </div>
        <div className="stat">
          <span className="stat__label">অ্যাডমিন অ্যাকাউন্ট</span>
          <span className="stat__value">{owners.length}</span>
        </div>
        <div className="stat">
          <span className="stat__label">সার্ভিস এলাকা</span>
          <span className="stat__value">{profile.deliveryAreas.length || '—'}</span>
        </div>
      </div>

      <div className="sample-links">
        <Link to="/admin/orders">অর্ডার</Link>
        <Link to="/admin/deliveries">ডেলিভারি</Link>
        <Link to="/admin/products">পণ্য ব্যবস্থাপনা</Link>
        <Link to="/admin/categories">ক্যাটাগরি</Link>
        <Link to="/admin/coupons">কুপন</Link>
        <Link to="/admin/materials">ইনভেন্টরি</Link>
        <Link to="/admin/purchases">ক্রয়</Link>
        <Link to="/admin/costing">কস্টিং</Link>
        <Link to="/admin/ordering-settings">অর্ডার সেটিংস</Link>
        <Link to="/admin/business-profile">বিজনেস প্রোফাইল</Link>
      </div>
    </section>
  )
}

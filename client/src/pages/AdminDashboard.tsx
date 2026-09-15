import { Link } from 'react-router-dom'
import { useBusinessProfile } from '../context/BusinessProfileContext'
import { useI18n } from '../context/LanguageContext'
import { useContentLang } from '../context/TranslationContext'

export function AdminDashboard() {
  const { profile } = useBusinessProfile()
  const { t } = useI18n()
  const { lc } = useContentLang()
  const owners = profile.partners.filter((p) => p.applicationRole === 'business_owner_admin')

  return (
    <section className="card">
      <h1>{lc(profile.name, profile.nameEnglish)} — {t('অ্যাডমিন ড্যাশবোর্ড', 'Admin Dashboard')}</h1>
      <p className="muted">{t('এখানে ব্যবসার সার্বিক তথ্য দেখা যাবে।', 'An overview of the business.')}</p>

      <div className="stat-row">
        <div className="stat">
          <span className="stat__label">{t('বিজনেস পার্টনার', 'Business partners')}</span>
          <span className="stat__value">{profile.partners.length}</span>
        </div>
        <div className="stat">
          <span className="stat__label">{t('অ্যাডমিন অ্যাকাউন্ট', 'Admin accounts')}</span>
          <span className="stat__value">{owners.length}</span>
        </div>
        <div className="stat">
          <span className="stat__label">{t('সার্ভিস এলাকা', 'Service areas')}</span>
          <span className="stat__value">{profile.deliveryAreas.length || '—'}</span>
        </div>
      </div>

      <div className="sample-links">
        <Link to="/admin/reports">{t('রিপোর্ট ও লাভ', 'Reports & profit')}</Link>
        <Link to="/admin/analytics">{t('অ্যানালিটিক্স', 'Analytics')}</Link>
        <Link to="/admin/orders">{t('অর্ডার', 'Orders')}</Link>
        <Link to="/admin/deliveries">{t('ডেলিভারি', 'Deliveries')}</Link>
        <Link to="/admin/expenses">{t('খরচ', 'Expenses')}</Link>
        <Link to="/admin/products">{t('পণ্য ব্যবস্থাপনা', 'Product management')}</Link>
        <Link to="/admin/categories">{t('ক্যাটাগরি', 'Categories')}</Link>
        <Link to="/admin/coupons">{t('কুপন', 'Coupons')}</Link>
        <Link to="/admin/materials">{t('ইনভেন্টরি', 'Inventory')}</Link>
        <Link to="/admin/purchases">{t('ক্রয়', 'Purchases')}</Link>
        <Link to="/admin/costing">{t('কস্টিং', 'Costing')}</Link>
        <Link to="/admin/ordering-settings">{t('অর্ডার সেটিংস', 'Ordering settings')}</Link>
        <Link to="/admin/business-profile">{t('বিজনেস প্রোফাইল', 'Business profile')}</Link>
      </div>
    </section>
  )
}

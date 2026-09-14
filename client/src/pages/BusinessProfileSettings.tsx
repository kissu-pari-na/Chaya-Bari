import { useEffect, useState, type FormEvent } from 'react'
import { useBusinessProfile } from '../context/BusinessProfileContext'
import { useI18n } from '../context/LanguageContext'
import { fetchPaymentInfo, updatePaymentInfo } from '../lib/payments'
import { ApiError } from '../lib/apiClient'
import { pick } from '../lib/i18n'
import type { ApplicationRole, BusinessPartner, BusinessProfile } from '../types/business'
import type { PaymentInfo } from '../types/payment'
import './BusinessProfileSettings.css'

const emptyPaymentInfo: PaymentInfo = { bkash: '', nagad: '', rocket: '', bankInfo: '' }

const roleLabels: Record<ApplicationRole, string> = {
  get business_owner_admin() {
    return pick('বিজনেস ওনার / অ্যাডমিন', 'Business owner / Admin')
  },
  get kitchen() {
    return pick('কিচেন', 'Kitchen')
  },
  get customer() {
    return pick('কাস্টমার', 'Customer')
  },
}

function updatePartner(partners: BusinessPartner[], id: string, patch: Partial<BusinessPartner>) {
  return partners.map((p) => (p.id === id ? { ...p, ...patch } : p))
}

export function BusinessProfileSettings() {
  const { profile, updateProfile } = useBusinessProfile()
  const { t } = useI18n()
  const [draft, setDraft] = useState<BusinessProfile>(profile)
  const [deliveryAreasText, setDeliveryAreasText] = useState(profile.deliveryAreas.join(', '))
  const [paymentInfo, setPaymentInfo] = useState<PaymentInfo>(emptyPaymentInfo)
  const [saved, setSaved] = useState(false)

  const totalOwnership = draft.partners.reduce((sum, p) => sum + p.ownershipPercent, 0)

  // Payment-account details are server-persisted (customers read them), unlike
  // the rest of this form which is in-memory for now.
  useEffect(() => {
    fetchPaymentInfo()
      .then((info) =>
        setPaymentInfo({
          bkash: info.bkash ?? '',
          nagad: info.nagad ?? '',
          rocket: info.rocket ?? '',
          bankInfo: info.bankInfo ?? '',
        }),
      )
      .catch(() => setPaymentInfo(emptyPaymentInfo))
  }, [])

  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    try {
      await Promise.all([
        updateProfile({
          ...draft,
          deliveryAreas: deliveryAreasText
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean),
        }),
        updatePaymentInfo(paymentInfo),
      ])
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('সংরক্ষণ করা যায়নি', 'Could not save'))
    }
  }

  return (
    <form className="card profile-form" onSubmit={handleSubmit}>
      <h1>{t('বিজনেস প্রোফাইল ও সেটিংস', 'Business profile & settings')}</h1>
      <p className="muted">
        {t('এই তথ্য পুরো অ্যাপ্লিকেশন জুড়ে (কাস্টমার পেজ, অ্যাডমিন, ইনভয়েস, নোটিফিকেশন, রিপোর্ট) ব্যবহৃত হয়।', 'This information is used across the whole app (customer pages, admin, invoices, notifications, reports).')}
      </p>

      <fieldset>
        <legend>{t('পরিচিতি', 'Identity')}</legend>

        <label>
          {t('বিজনেস নাম', 'Business name')}
          <input
            value={draft.name}
            onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
            required
          />
        </label>

        <label>
          Business Name (English)
          <input
            value={draft.nameEnglish ?? ''}
            onChange={(e) => setDraft((d) => ({ ...d, nameEnglish: e.target.value }))}
          />
        </label>

        <label>
          {t('লোগো URL', 'Logo URL')}
          <input
            value={draft.logoUrl}
            onChange={(e) => setDraft((d) => ({ ...d, logoUrl: e.target.value }))}
          />
        </label>
        <p className="hint">{t('লোগো কনফিগারযোগ্য — নতুন ছবি আপলোড করে কোড পরিবর্তন ছাড়াই বদলানো যাবে।', 'The logo is configurable — upload a new image to change it without code changes.')}</p>

        <label>
          {t('ট্যাগলাইন', 'Tagline')}
          <input
            value={draft.tagline ?? ''}
            onChange={(e) => setDraft((d) => ({ ...d, tagline: e.target.value }))}
          />
        </label>
      </fieldset>

      <fieldset>
        <legend>{t('যোগাযোগ ও ঠিকানা', 'Contact & address')}</legend>
        <label>
          {t('ফোন', 'Phone')}
          <input
            value={draft.contact.phone}
            onChange={(e) => setDraft((d) => ({ ...d, contact: { ...d.contact, phone: e.target.value } }))}
          />
        </label>
        <label>
          {t('ইমেইল', 'Email')}
          <input
            type="email"
            value={draft.contact.email}
            onChange={(e) => setDraft((d) => ({ ...d, contact: { ...d.contact, email: e.target.value } }))}
          />
        </label>
        <label>
          {t('ঠিকানা (লাইন ১)', 'Address (line 1)')}
          <input
            value={draft.address.line1}
            onChange={(e) => setDraft((d) => ({ ...d, address: { ...d.address, line1: e.target.value } }))}
          />
        </label>
        <label>
          {t('এলাকা', 'Area')}
          <input
            value={draft.address.area}
            onChange={(e) => setDraft((d) => ({ ...d, address: { ...d.address, area: e.target.value } }))}
          />
        </label>
        <label>
          {t('শহর', 'City')}
          <input
            value={draft.address.city}
            onChange={(e) => setDraft((d) => ({ ...d, address: { ...d.address, city: e.target.value } }))}
          />
        </label>
        <label>
          {t('ডেলিভারি / সার্ভিস এলাকা (কমা দিয়ে আলাদা করুন)', 'Delivery / service areas (comma-separated)')}
          <input value={deliveryAreasText} onChange={(e) => setDeliveryAreasText(e.target.value)} />
        </label>
      </fieldset>

      <fieldset>
        <legend>{t('বিজনেস পার্টনার ও মালিকানা', 'Business partners & ownership')}</legend>
        <p className="hint">
          {t('মালিকানার শতাংশ অ্যাপ্লিকেশনের অ্যাক্সেস নিয়ন্ত্রণ করে না — অ্যাক্সেস সবসময় রোল ভিত্তিক (নিচে দেখুন)।', 'Ownership percentage does not control app access — access is always role-based (see below).')}
        </p>

        <table className="partner-table">
          <thead>
            <tr>
              <th>{t('নাম', 'Name')}</th>
              <th>{t('মালিকানা %', 'Ownership %')}</th>
              <th>{t('অ্যাপ্লিকেশন রোল', 'App role')}</th>
            </tr>
          </thead>
          <tbody>
            {draft.partners.map((partner) => (
              <tr key={partner.id}>
                <td>
                  <input
                    value={partner.name}
                    onChange={(e) =>
                      setDraft((d) => ({ ...d, partners: updatePartner(d.partners, partner.id, { name: e.target.value }) }))
                    }
                  />
                </td>
                <td>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={partner.ownershipPercent}
                    onChange={(e) =>
                      setDraft((d) => ({
                        ...d,
                        partners: updatePartner(d.partners, partner.id, { ownershipPercent: Number(e.target.value) }),
                      }))
                    }
                  />
                </td>
                <td>
                  <select
                    value={partner.applicationRole ?? ''}
                    onChange={(e) =>
                      setDraft((d) => ({
                        ...d,
                        partners: updatePartner(d.partners, partner.id, {
                          applicationRole: (e.target.value || undefined) as ApplicationRole | undefined,
                        }),
                      }))
                    }
                  >
                    <option value="">{t('কোনো অ্যাকাউন্ট নেই', 'No account')}</option>
                    {(Object.keys(roleLabels) as ApplicationRole[]).map((role) => (
                      <option key={role} value={role}>
                        {roleLabels[role]}
                      </option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className={totalOwnership === 100 ? 'hint' : 'hint hint--warning'}>
          {t('মোট মালিকানা:', 'Total ownership:')} {totalOwnership}% {totalOwnership !== 100 && t('(১০০% হওয়া উচিত)', '(should be 100%)')}
        </p>
      </fieldset>

      <fieldset>
        <legend>{t('ডিফল্ট সেটিংস', 'Default settings')}</legend>
        <label>
          {t('মুদ্রা', 'Currency')}
          <input
            value={draft.defaultSettings.currency}
            onChange={(e) =>
              setDraft((d) => ({ ...d, defaultSettings: { ...d.defaultSettings, currency: e.target.value } }))
            }
          />
        </label>
        <label>
          {t('অর্ডার আইডি প্রিফিক্স', 'Order ID prefix')}
          <input
            value={draft.defaultSettings.orderIdPrefix}
            onChange={(e) =>
              setDraft((d) => ({ ...d, defaultSettings: { ...d.defaultSettings, orderIdPrefix: e.target.value } }))
            }
          />
        </label>
      </fieldset>

      <fieldset>
        <legend>{t('পেমেন্ট অ্যাকাউন্ট', 'Payment accounts')}</legend>
        <p className="hint">
          {t('এই নম্বরগুলো গ্রাহকদের পেমেন্টের সময় দেখানো হয় (সরাসরি/ম্যানুয়াল পেমেন্টের জন্য)। খালি রাখলে দেখানো হবে না।', 'These numbers are shown to customers at payment time (for direct/manual payments). Leave blank to hide.')}
        </p>
        <label>
          {t('বিকাশ নম্বর', 'bKash number')}
          <input
            value={paymentInfo.bkash ?? ''}
            onChange={(e) => setPaymentInfo((p) => ({ ...p, bkash: e.target.value }))}
            placeholder="01XXXXXXXXX (Personal)"
          />
        </label>
        <label>
          {t('নগদ নম্বর', 'Nagad number')}
          <input
            value={paymentInfo.nagad ?? ''}
            onChange={(e) => setPaymentInfo((p) => ({ ...p, nagad: e.target.value }))}
            placeholder="01XXXXXXXXX (Personal)"
          />
        </label>
        <label>
          {t('রকেট নম্বর', 'Rocket number')}
          <input
            value={paymentInfo.rocket ?? ''}
            onChange={(e) => setPaymentInfo((p) => ({ ...p, rocket: e.target.value }))}
            placeholder="01XXXXXXXXX-X"
          />
        </label>
        <label>
          {t('ব্যাংক তথ্য', 'Bank info')}
          <input
            value={paymentInfo.bankInfo ?? ''}
            onChange={(e) => setPaymentInfo((p) => ({ ...p, bankInfo: e.target.value }))}
            placeholder="Bank, A/C No, Name"
          />
        </label>
      </fieldset>

      <div className="profile-form__actions">
        <button type="submit">{t('সংরক্ষণ করুন', 'Save')}</button>
        {saved && <span className="hint hint--success">{t('সংরক্ষিত হয়েছে', 'Saved')}</span>}
        {error && <span className="hint hint--warning">{error}</span>}
      </div>
    </form>
  )
}

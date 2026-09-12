import { useEffect, useState, type FormEvent } from 'react'
import { useBusinessProfile } from '../context/BusinessProfileContext'
import { fetchPaymentInfo, updatePaymentInfo } from '../lib/payments'
import type { ApplicationRole, BusinessPartner, BusinessProfile } from '../types/business'
import type { PaymentInfo } from '../types/payment'
import './BusinessProfileSettings.css'

const emptyPaymentInfo: PaymentInfo = { bkash: '', nagad: '', rocket: '', bankInfo: '' }

const roleLabels: Record<ApplicationRole, string> = {
  business_owner_admin: 'বিজনেস ওনার / অ্যাডমিন',
  kitchen: 'কিচেন',
  customer: 'কাস্টমার',
}

function updatePartner(partners: BusinessPartner[], id: string, patch: Partial<BusinessPartner>) {
  return partners.map((p) => (p.id === id ? { ...p, ...patch } : p))
}

export function BusinessProfileSettings() {
  const { profile, updateProfile } = useBusinessProfile()
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

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    updateProfile({
      ...draft,
      deliveryAreas: deliveryAreasText
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    })
    try {
      await updatePaymentInfo(paymentInfo)
    } catch {
      /* non-blocking: the rest of the profile still saves */
    }
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  return (
    <form className="card profile-form" onSubmit={handleSubmit}>
      <h1>বিজনেস প্রোফাইল ও সেটিংস</h1>
      <p className="muted">
        এই তথ্য পুরো অ্যাপ্লিকেশন জুড়ে (কাস্টমার পেজ, অ্যাডমিন, ইনভয়েস, নোটিফিকেশন, রিপোর্ট) ব্যবহৃত হয়।
      </p>

      <fieldset>
        <legend>পরিচিতি</legend>

        <label>
          বিজনেস নাম
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
          লোগো URL
          <input
            value={draft.logoUrl}
            onChange={(e) => setDraft((d) => ({ ...d, logoUrl: e.target.value }))}
          />
        </label>
        <p className="hint">লোগো কনফিগারযোগ্য — নতুন ছবি আপলোড করে কোড পরিবর্তন ছাড়াই বদলানো যাবে।</p>

        <label>
          ট্যাগলাইন
          <input
            value={draft.tagline ?? ''}
            onChange={(e) => setDraft((d) => ({ ...d, tagline: e.target.value }))}
          />
        </label>
      </fieldset>

      <fieldset>
        <legend>যোগাযোগ ও ঠিকানা</legend>
        <label>
          ফোন
          <input
            value={draft.contact.phone}
            onChange={(e) => setDraft((d) => ({ ...d, contact: { ...d.contact, phone: e.target.value } }))}
          />
        </label>
        <label>
          ইমেইল
          <input
            type="email"
            value={draft.contact.email}
            onChange={(e) => setDraft((d) => ({ ...d, contact: { ...d.contact, email: e.target.value } }))}
          />
        </label>
        <label>
          ঠিকানা (লাইন ১)
          <input
            value={draft.address.line1}
            onChange={(e) => setDraft((d) => ({ ...d, address: { ...d.address, line1: e.target.value } }))}
          />
        </label>
        <label>
          এলাকা
          <input
            value={draft.address.area}
            onChange={(e) => setDraft((d) => ({ ...d, address: { ...d.address, area: e.target.value } }))}
          />
        </label>
        <label>
          শহর
          <input
            value={draft.address.city}
            onChange={(e) => setDraft((d) => ({ ...d, address: { ...d.address, city: e.target.value } }))}
          />
        </label>
        <label>
          ডেলিভারি / সার্ভিস এলাকা (কমা দিয়ে আলাদা করুন)
          <input value={deliveryAreasText} onChange={(e) => setDeliveryAreasText(e.target.value)} />
        </label>
      </fieldset>

      <fieldset>
        <legend>বিজনেস পার্টনার ও মালিকানা</legend>
        <p className="hint">
          মালিকানার শতাংশ অ্যাপ্লিকেশনের অ্যাক্সেস নিয়ন্ত্রণ করে না — অ্যাক্সেস সবসময় রোল ভিত্তিক (নিচে দেখুন)।
        </p>

        <table className="partner-table">
          <thead>
            <tr>
              <th>নাম</th>
              <th>মালিকানা %</th>
              <th>অ্যাপ্লিকেশন রোল</th>
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
                    <option value="">কোনো অ্যাকাউন্ট নেই</option>
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
          মোট মালিকানা: {totalOwnership}% {totalOwnership !== 100 && '(১০০% হওয়া উচিত)'}
        </p>
      </fieldset>

      <fieldset>
        <legend>ডিফল্ট সেটিংস</legend>
        <label>
          মুদ্রা
          <input
            value={draft.defaultSettings.currency}
            onChange={(e) =>
              setDraft((d) => ({ ...d, defaultSettings: { ...d.defaultSettings, currency: e.target.value } }))
            }
          />
        </label>
        <label>
          অর্ডার আইডি প্রিফিক্স
          <input
            value={draft.defaultSettings.orderIdPrefix}
            onChange={(e) =>
              setDraft((d) => ({ ...d, defaultSettings: { ...d.defaultSettings, orderIdPrefix: e.target.value } }))
            }
          />
        </label>
      </fieldset>

      <fieldset>
        <legend>পেমেন্ট অ্যাকাউন্ট</legend>
        <p className="hint">
          এই নম্বরগুলো গ্রাহকদের পেমেন্টের সময় দেখানো হয় (সরাসরি/ম্যানুয়াল পেমেন্টের জন্য)। খালি রাখলে
          দেখানো হবে না।
        </p>
        <label>
          বিকাশ নম্বর
          <input
            value={paymentInfo.bkash ?? ''}
            onChange={(e) => setPaymentInfo((p) => ({ ...p, bkash: e.target.value }))}
            placeholder="01XXXXXXXXX (Personal)"
          />
        </label>
        <label>
          নগদ নম্বর
          <input
            value={paymentInfo.nagad ?? ''}
            onChange={(e) => setPaymentInfo((p) => ({ ...p, nagad: e.target.value }))}
            placeholder="01XXXXXXXXX (Personal)"
          />
        </label>
        <label>
          রকেট নম্বর
          <input
            value={paymentInfo.rocket ?? ''}
            onChange={(e) => setPaymentInfo((p) => ({ ...p, rocket: e.target.value }))}
            placeholder="01XXXXXXXXX-X"
          />
        </label>
        <label>
          ব্যাংক তথ্য
          <input
            value={paymentInfo.bankInfo ?? ''}
            onChange={(e) => setPaymentInfo((p) => ({ ...p, bankInfo: e.target.value }))}
            placeholder="Bank, A/C No, Name"
          />
        </label>
      </fieldset>

      <div className="profile-form__actions">
        <button type="submit">সংরক্ষণ করুন</button>
        {saved && <span className="hint hint--success">সংরক্ষিত হয়েছে</span>}
      </div>
    </form>
  )
}

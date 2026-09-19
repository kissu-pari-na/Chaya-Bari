import { useBusinessProfile } from '../context/BusinessProfileContext'
import { useI18n } from '../context/LanguageContext'
import { useContentLang } from '../context/TranslationContext'
import './Contact.css'

/// Public contact page: shows how customers can reach Chaya Bari (phone, email,
/// address, delivery areas). Details come from the business profile so they stay
/// in sync with what's configured in admin settings.
export function Contact() {
  const { profile } = useBusinessProfile()
  const { t } = useI18n()
  const { lc } = useContentLang()

  const bizName = lc(profile.name, profile.nameEnglish)
  const tagline = lc(profile.tagline ?? '', profile.taglineEnglish ?? '')
  const { phone, email } = profile.contact
  const a = profile.address
  const addressLine = [a.line1, a.area, a.city, a.postCode, a.country].filter(Boolean).join(', ')
  // Strip spaces/dashes for a dialable tel: link.
  const telHref = `tel:${phone.replace(/[^\d+]/g, '')}`

  return (
    <section className="contact">
      <header className="contact__head">
        <h1>{t('যোগাযোগ', 'Contact us')}</h1>
        <p className="muted">
          {t(
            `${bizName}-এর সাথে যেকোনো প্রয়োজনে যোগাযোগ করুন। অর্ডার সংক্রান্ত সাহায্য, বাতিল বা যেকোনো প্রশ্নে আমরা আছি।`,
            `Reach ${bizName} for anything you need — help with an order, a cancellation, or any question.`,
          )}
        </p>
      </header>

      <div className="contact__cards">
        <a className="contact__card" href={telHref}>
          <span className="contact__icon" aria-hidden="true">📞</span>
          <span className="contact__label">{t('ফোন / হোয়াটসঅ্যাপ', 'Phone / WhatsApp')}</span>
          <span className="contact__value">{phone}</span>
        </a>
        <a className="contact__card" href={`mailto:${email}`}>
          <span className="contact__icon" aria-hidden="true">✉️</span>
          <span className="contact__label">{t('ইমেইল', 'Email')}</span>
          <span className="contact__value">{email}</span>
        </a>
        {addressLine && (
          <div className="contact__card">
            <span className="contact__icon" aria-hidden="true">📍</span>
            <span className="contact__label">{t('ঠিকানা', 'Address')}</span>
            <span className="contact__value">{addressLine}</span>
          </div>
        )}
      </div>

      {profile.deliveryAreas.length > 0 && (
        <div className="contact__areas">
          <h2>{t('ডেলিভারি এলাকা', 'Delivery areas')}</h2>
          <p className="muted">{profile.deliveryAreas.join(' · ')}</p>
        </div>
      )}

      {tagline && <p className="contact__tagline">“{tagline}”</p>}
    </section>
  )
}

import { useBusinessProfile } from '../context/BusinessProfileContext'
import { useI18n } from '../context/LanguageContext'
import { Logo } from './Logo'
import './DocumentHeader.css'

/** Business identity block used at the top of printable documents (invoices, receipts, order confirmations). */
export function DocumentHeader() {
  const { profile } = useBusinessProfile()
  const { tc } = useI18n()

  return (
    <div className="doc-header">
      {/* Accent mark on the dark glass sheet; deep-green mark when printed on white. */}
      <span className="doc-header__logo doc-header__logo--screen">
        <Logo size={56} link={false} />
      </span>
      <span className="doc-header__logo doc-header__logo--print">
        <Logo size={56} onLight link={false} />
      </span>
      <div className="doc-header__details">
        {tc(profile.tagline, profile.taglineEnglish) && (
          <p className="doc-header__tagline">{tc(profile.tagline, profile.taglineEnglish)}</p>
        )}
        <p>{profile.address.line1 ? `${profile.address.line1}, ` : ''}{profile.address.city}, {profile.address.country}</p>
        <p>{profile.contact.phone} · {profile.contact.email}</p>
      </div>
    </div>
  )
}

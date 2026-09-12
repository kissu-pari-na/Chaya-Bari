import { useBusinessProfile } from '../context/BusinessProfileContext'
import { Logo } from './Logo'
import './DocumentHeader.css'

/** Business identity block used at the top of printable documents (invoices, receipts, order confirmations). */
export function DocumentHeader() {
  const { profile } = useBusinessProfile()

  return (
    <div className="doc-header">
      <Logo size={56} onLight />
      <div className="doc-header__details">
        {profile.tagline && <p className="doc-header__tagline">{profile.tagline}</p>}
        <p>{profile.address.line1 ? `${profile.address.line1}, ` : ''}{profile.address.city}, {profile.address.country}</p>
        <p>{profile.contact.phone} · {profile.contact.email}</p>
      </div>
    </div>
  )
}

import { useBusinessProfile } from '../context/BusinessProfileContext'
import './Logo.css'

interface LogoProps {
  size?: number
  showName?: boolean
}

/** Renders the configured business logo + name. Never hard-code these elsewhere. */
export function Logo({ size = 40, showName = true }: LogoProps) {
  const { profile } = useBusinessProfile()

  return (
    <div className="logo">
      <img src={profile.logoUrl} alt={`${profile.name} logo`} width={size} height={size} />
      {showName && (
        <span className="logo__name">
          {profile.name}
          {profile.nameEnglish && <span className="logo__name-en"> · {profile.nameEnglish}</span>}
        </span>
      )}
    </div>
  )
}

import { useBusinessProfile } from '../context/BusinessProfileContext'
import './Logo.css'

interface LogoProps {
  /** Rendered height of the mark in px (width scales to keep the artwork's aspect ratio). */
  size?: number
  /** Use the light-background variant (deep green) for printed documents; default is the dark-surface variant. */
  onLight?: boolean
}

/**
 * Renders the ছায়া বাড়ি brand mark. The wordmark is part of the artwork, so we
 * show the image alone (no separate text). Two theme-recoloured variants of the
 * same mark are used: accent green on dark surfaces, deep green on light ones.
 */
export function Logo({ size = 40, onLight = false }: LogoProps) {
  const { profile } = useBusinessProfile()
  const src = onLight ? '/logo-light.png' : '/logo-dark.png'

  return (
    <div className="logo">
      <img src={src} alt={`${profile.name} logo`} height={size} />
    </div>
  )
}

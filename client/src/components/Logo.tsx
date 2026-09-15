import { Link } from 'react-router-dom'
import { useBusinessProfile } from '../context/BusinessProfileContext'
import { useAuth } from '../context/AuthContext'
import { roleHome } from './ProtectedRoute'
import './Logo.css'

interface LogoProps {
  /** Rendered height of the mark in px (width scales to keep the artwork's aspect ratio). */
  size?: number
  /** Use the light-background variant (deep green) for printed documents; default is the dark-surface variant. */
  onLight?: boolean
  /** Set false to render a static mark (e.g. on a printed document) instead of a home link. */
  link?: boolean
}

/**
 * Renders the ছায়া বাড়ি brand mark. The wordmark is part of the artwork, so we
 * show the image alone (no separate text). By default the mark is a link back
 * to the home page; pass link={false} for static contexts like print.
 */
export function Logo({ size = 40, onLight = false, link = true }: LogoProps) {
  const { profile } = useBusinessProfile()
  const { user } = useAuth()
  const src = onLight ? '/logo-light.png' : '/logo-dark.png'
  const img = <img src={src} alt={`${profile.name} logo`} height={size} />

  if (!link) {
    return <div className="logo">{img}</div>
  }

  // Send each role to its own home so an admin/kitchen user clicking the mark
  // stays in their area instead of landing on the customer storefront.
  const to = user ? roleHome[user.role] : '/'

  return (
    <Link to={to} className="logo logo--link" aria-label={`${profile.name} — হোম / Home`}>
      {img}
    </Link>
  )
}

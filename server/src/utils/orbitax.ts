/// Orbitax staff are identified by their email domain. They get a self-service
/// billing page (see the orbitax module) that lets them settle the combined
/// outstanding balance across all their orders. Matches "orbitax.com" and any
/// subdomain of it (e.g. "team.orbitax.com").
export function isOrbitaxEmail(email: string | null | undefined): boolean {
  if (!email) return false
  const domain = email.trim().toLowerCase().split('@')[1] ?? ''
  return domain === 'orbitax.com' || domain.endsWith('.orbitax.com')
}

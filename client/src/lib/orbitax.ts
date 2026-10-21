/// Whether an email belongs to Orbitax staff, who may also order to their
/// Mohakhali office and get the automatic delivery coupon. Matches "orbitax.com"
/// and any subdomain of it; mirrors the server-side check. (Their combined
/// billing moved into the wallet, vault D-ORB-002.)
export function isOrbitaxEmail(email: string | null | undefined): boolean {
  if (!email) return false
  const domain = email.trim().toLowerCase().split('@')[1] ?? ''
  return domain === 'orbitax.com' || domain.endsWith('.orbitax.com')
}

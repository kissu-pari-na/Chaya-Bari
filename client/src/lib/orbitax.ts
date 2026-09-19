import { apiRequest } from './apiClient'
import type { OrbitaxAccount, OrbitaxPayInput, OrbitaxPayResult } from '../types/orbitax'

/// Whether an email belongs to Orbitax staff (drives the header icon). Matches
/// "orbitax.com" and any subdomain of it. Mirrors the server-side check.
export function isOrbitaxEmail(email: string | null | undefined): boolean {
  if (!email) return false
  const domain = email.trim().toLowerCase().split('@')[1] ?? ''
  return domain === 'orbitax.com' || domain.endsWith('.orbitax.com')
}

/// The signed-in Orbitax user's combined billing summary.
export function fetchOrbitaxAccount() {
  return apiRequest<{ account: OrbitaxAccount }>('/orbitax/account', { auth: true }).then((r) => r.account)
}

/// Pay a lump amount against the combined outstanding balance.
export function payOrbitax(input: OrbitaxPayInput) {
  return apiRequest<OrbitaxPayResult>('/orbitax/pay', { method: 'POST', body: input, auth: true })
}

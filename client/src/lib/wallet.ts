import { apiRequest } from './apiClient'
import type { AdminOrder } from '../types/order'
import type {
  AdjustInput,
  ClaimInput,
  LimitGrant,
  PendingClaim,
  RecordPaymentInput,
  WalletEntry,
  WalletRow,
  WalletSummary,
  WalletTotals,
} from '../types/payment'

// ---- Customer ----

export function fetchMyWallet() {
  return apiRequest<{ wallet: WalletSummary; timeline: WalletEntry[] }>('/wallet', { auth: true })
}

/// Report a manual payment (bKash/Nagad/Rocket/bank) with its reference. It
/// counts once an admin confirms it. Pass orderId to pay for a pay-first order.
export function submitClaim(input: ClaimInput) {
  return apiRequest<{ entry: WalletEntry }>('/wallet/claims', { method: 'POST', body: input, auth: true }).then((r) => r.entry)
}

/// Redeem a promo code that raises the pay-later limit for a while.
export function redeemLimitCode(code: string) {
  return apiRequest<{ grant: LimitGrant; wallet: WalletSummary }>('/wallet/redeem', {
    method: 'POST',
    body: { code },
    auth: true,
  })
}

// ---- Admin ----

export function fetchWallets(search?: string) {
  const q = search ? `?search=${encodeURIComponent(search)}` : ''
  return apiRequest<{ wallets: WalletRow[]; totals: WalletTotals }>(`/admin/wallets${q}`, { auth: true })
}

export function fetchPendingClaims() {
  return apiRequest<{ claims: PendingClaim[] }>('/admin/wallets/claims', { auth: true }).then((r) => r.claims)
}

export function fetchCustomerWallet(customerId: string) {
  return apiRequest<{
    customer: { id: string; name: string; email: string; phone: string | null }
    wallet: WalletSummary
    timeline: WalletEntry[]
  }>(`/admin/wallets/${customerId}`, { auth: true })
}

export function adjustWallet(customerId: string, input: AdjustInput) {
  return apiRequest<{ entry: WalletEntry; wallet: WalletSummary }>(`/admin/wallets/${customerId}/adjust`, {
    method: 'POST',
    body: input,
    auth: true,
  })
}

export function reviewClaim(entryId: string, action: 'confirm' | 'reject', note?: string) {
  return apiRequest<{ entry: WalletEntry }>(`/admin/wallet-entries/${entryId}/review`, {
    method: 'POST',
    body: { action, note },
    auth: true,
  }).then((r) => r.entry)
}

/// Admin records money received for an order (guest bKash, cash at the counter…).
export function recordOrderPayment(orderId: string, input: RecordPaymentInput) {
  return apiRequest<{ order: AdminOrder }>(`/admin/orders/${orderId}/payments`, {
    method: 'POST',
    body: input,
    auth: true,
  }).then((r) => r.order)
}

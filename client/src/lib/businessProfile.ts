import { apiRequest } from './apiClient'
import type { BusinessProfile } from '../types/business'

/// Public: the business identity shown across the app.
export function fetchBusinessProfile() {
  return apiRequest<{ profile: BusinessProfile }>('/business-profile').then((r) => r.profile)
}

/// Admin: persist the business identity for all clients.
export function updateBusinessProfileApi(profile: BusinessProfile) {
  return apiRequest<{ profile: BusinessProfile }>('/admin/business-profile', {
    method: 'PUT',
    body: profile,
    auth: true,
  }).then((r) => r.profile)
}

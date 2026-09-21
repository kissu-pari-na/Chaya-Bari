import { apiRequest } from './apiClient'
import type { AdminUser, CreateUserInput } from '../types/user'

export function fetchUsers() {
  return apiRequest<{ users: AdminUser[] }>('/admin/users', { auth: true }).then((r) => r.users)
}

/// Numbered pagination for the admin users table: a page plus the total count.
export function fetchUsersPage(page: { offset: number; limit: number }) {
  const params = new URLSearchParams({ offset: String(page.offset), limit: String(page.limit) })
  return apiRequest<{ users: AdminUser[]; total: number }>(`/admin/users?${params.toString()}`, { auth: true })
}

export function createUser(input: CreateUserInput) {
  return apiRequest<{ user: AdminUser }>('/admin/users', {
    method: 'POST',
    body: input,
    auth: true,
  }).then((r) => r.user)
}

import { apiRequest } from './apiClient'
import type { AdminUser, CreateUserInput } from '../types/user'

export function fetchUsers() {
  return apiRequest<{ users: AdminUser[] }>('/admin/users', { auth: true }).then((r) => r.users)
}

export function createUser(input: CreateUserInput) {
  return apiRequest<{ user: AdminUser }>('/admin/users', {
    method: 'POST',
    body: input,
    auth: true,
  }).then((r) => r.user)
}

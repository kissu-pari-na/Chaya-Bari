import { apiRequest } from './apiClient'

export interface AppNotification {
  id: string
  type: string
  title: string
  body: string
  orderId: string | null
  read: boolean
  createdAt: string
}

export function fetchNotifications() {
  return apiRequest<{ notifications: AppNotification[]; unread: number }>('/notifications', { auth: true })
}

export function markNotificationRead(id: string) {
  return apiRequest<void>(`/notifications/${id}/read`, { method: 'POST', auth: true })
}

export function markAllNotificationsRead() {
  return apiRequest<void>('/notifications/read-all', { method: 'POST', auth: true })
}

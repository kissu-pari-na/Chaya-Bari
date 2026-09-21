import { apiRequest } from './apiClient'

/// Localization payload the client uses to render the notification text in the
/// active language. `title`/`body` remain as the Bengali fallback.
export interface NotificationData {
  key: string
  orderNumber?: string
  amount?: number
  method?: string
}

export interface AppNotification {
  id: string
  type: string
  title: string
  body: string
  data: NotificationData | null
  orderId: string | null
  link: string | null
  read: boolean
  createdAt: string
}

export function fetchNotifications(limit?: number) {
  const query = limit ? `?limit=${limit}` : ''
  return apiRequest<{ notifications: AppNotification[]; unread: number; total: number }>(
    `/notifications${query}`,
    { auth: true },
  )
}

export function markNotificationRead(id: string) {
  return apiRequest<void>(`/notifications/${id}/read`, { method: 'POST', auth: true })
}

export function markAllNotificationsRead() {
  return apiRequest<void>('/notifications/read-all', { method: 'POST', auth: true })
}

export function clearAllNotifications() {
  return apiRequest<void>('/notifications', { method: 'DELETE', auth: true })
}

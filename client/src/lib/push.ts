import { apiRequest } from './apiClient'

/// Whether this browser can do Web Push at all.
export function pushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  )
}

/// Current OS permission for notifications ('default' | 'granted' | 'denied').
export function pushPermission(): NotificationPermission {
  return pushSupported() ? Notification.permission : 'denied'
}

/// The VAPID public key from the server (null when push isn't configured there).
export function fetchVapidKey(): Promise<string | null> {
  return apiRequest<{ publicKey: string | null }>('/push/public-key').then((r) => r.publicKey)
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = window.atob(base64)
  const output = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i += 1) output[i] = raw.charCodeAt(i)
  return output
}

/// Register the service worker (safe to call repeatedly). Returns null if
/// unsupported or registration fails.
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) return null
  try {
    return await navigator.serviceWorker.register('/sw.js')
  } catch {
    return null
  }
}

export type SubscribeResult =
  | { ok: true }
  | { ok: false; reason: 'unsupported' | 'not-configured' | 'denied' | 'error' }

/// Ask permission (if needed) and subscribe this device to push, saving the
/// subscription on the server. Must be triggered by a user gesture the first
/// time (browser requirement for the permission prompt).
export async function enablePush(): Promise<SubscribeResult> {
  if (!pushSupported()) return { ok: false, reason: 'unsupported' }
  try {
    const key = await fetchVapidKey()
    if (!key) return { ok: false, reason: 'not-configured' }

    const permission = await Notification.requestPermission()
    if (permission !== 'granted') return { ok: false, reason: 'denied' }

    const reg = (await registerServiceWorker()) ?? (await navigator.serviceWorker.ready)
    await navigator.serviceWorker.ready
    const existing = await reg.pushManager.getSubscription()
    const sub =
      existing ??
      (await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(key) as BufferSource,
      }))

    const json = sub.toJSON() as { endpoint?: string; keys?: { p256dh?: string; auth?: string } }
    if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) return { ok: false, reason: 'error' }
    await apiRequest('/push/subscribe', {
      method: 'POST',
      body: { endpoint: json.endpoint, keys: { p256dh: json.keys.p256dh, auth: json.keys.auth } },
      auth: true,
    })
    return { ok: true }
  } catch {
    return { ok: false, reason: 'error' }
  }
}

/// Unsubscribe this device (locally + on the server).
export async function disablePush(): Promise<void> {
  if (!pushSupported()) return
  try {
    const reg = await navigator.serviceWorker.ready
    const sub = await reg.pushManager.getSubscription()
    if (sub) {
      await apiRequest('/push/unsubscribe', { method: 'POST', body: { endpoint: sub.endpoint }, auth: true }).catch(
        () => {},
      )
      await sub.unsubscribe().catch(() => {})
    }
  } catch {
    /* ignore */
  }
}

/// Whether this device already has an active push subscription.
export async function isSubscribed(): Promise<boolean> {
  if (!pushSupported() || Notification.permission !== 'granted') return false
  try {
    const reg = await navigator.serviceWorker.ready
    return !!(await reg.pushManager.getSubscription())
  } catch {
    return false
  }
}

/// Silently keep the server in sync when permission is already granted (e.g. on
/// login or app load). Never prompts. Safe to call often.
export async function syncPushSubscription(): Promise<void> {
  if (!pushSupported() || Notification.permission !== 'granted') return
  await enablePush().catch(() => {})
}

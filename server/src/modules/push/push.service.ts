import webpush from 'web-push'
import { prisma } from '../../lib/prisma.js'
import { logger } from '../../lib/logger.js'
import { env, isPushEnabled } from '../../config/env.js'

// Configure VAPID once at startup when keys are present. When they're absent the
// whole feature no-ops so the app runs fine without push configured.
if (isPushEnabled) {
  webpush.setVapidDetails(env.vapid.subject, env.vapid.publicKey, env.vapid.privateKey)
}

export const pushEnabled = isPushEnabled

/// The VAPID public key the browser needs to create a subscription (null when
/// push isn't configured).
export function publicKey(): string | null {
  return isPushEnabled ? env.vapid.publicKey : null
}

export interface PushSubscriptionInput {
  endpoint: string
  keys: { p256dh: string; auth: string }
}

/// Save (or refresh) a device's push subscription for a user. Keyed by endpoint,
/// so re-subscribing the same device updates its keys and re-owner instead of
/// creating duplicates.
export async function saveSubscription(userId: string, sub: PushSubscriptionInput): Promise<void> {
  await prisma.pushSubscription.upsert({
    where: { endpoint: sub.endpoint },
    create: { userId, endpoint: sub.endpoint, p256dh: sub.keys.p256dh, auth: sub.keys.auth },
    update: { userId, p256dh: sub.keys.p256dh, auth: sub.keys.auth },
  })
}

/// Remove a device's subscription (on unsubscribe / sign-out).
export async function removeSubscription(userId: string, endpoint: string): Promise<void> {
  await prisma.pushSubscription.deleteMany({ where: { userId, endpoint } })
}

export interface PushPayload {
  title: string
  body: string
  /// In-app path to open on click.
  url?: string
  /// Collapse tag so repeated updates for the same order replace each other.
  tag?: string
}

/// Send a push to all of a user's devices. Never throws into the caller — a
/// failed push must not break an order/payment flow. Expired subscriptions
/// (404/410) are pruned automatically.
export async function sendPushToUser(userId: string, payload: PushPayload): Promise<void> {
  if (!isPushEnabled) return
  let subs
  try {
    subs = await prisma.pushSubscription.findMany({ where: { userId } })
  } catch (err) {
    logger.error('Failed to load push subscriptions', { message: err instanceof Error ? err.message : String(err) })
    return
  }
  if (subs.length === 0) return

  const body = JSON.stringify(payload)
  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          body,
        )
      } catch (err: unknown) {
        const statusCode = (err as { statusCode?: number })?.statusCode
        if (statusCode === 404 || statusCode === 410) {
          // Subscription is gone (unsubscribed / expired) — prune it.
          await prisma.pushSubscription.delete({ where: { id: s.id } }).catch(() => {})
        } else {
          logger.error('Failed to send web push', { message: err instanceof Error ? err.message : String(err) })
        }
      }
    }),
  )
}

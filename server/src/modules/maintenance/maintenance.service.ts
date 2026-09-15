import { logger } from '../../lib/logger.js'
import { purgeExpiredRateLimits } from '../../lib/rateLimit.js'
import { expireUnverifiedAccounts } from '../auth/auth.service.js'
import { dispatchReviewInvites } from '../reviews/review-invite.service.js'

export interface MaintenanceReport {
  expiredUnverifiedAccounts: number
  purgedRateLimits: number
}

/// Periodic housekeeping, safe to run repeatedly. Driven by Vercel Cron on
/// serverless and by the boot interval on a persistent host.
export async function runMaintenance(): Promise<MaintenanceReport> {
  const expiredUnverifiedAccounts = await expireUnverifiedAccounts()
  const purgedRateLimits = await purgeExpiredRateLimits()
  // Day-after-delivery review invites (each order invited at most once).
  await dispatchReviewInvites().catch((err) => {
    logger.error('Review invite dispatch failed', {
      message: err instanceof Error ? err.message : String(err),
    })
  })
  logger.info('Maintenance run complete', { expiredUnverifiedAccounts, purgedRateLimits })
  return { expiredUnverifiedAccounts, purgedRateLimits }
}

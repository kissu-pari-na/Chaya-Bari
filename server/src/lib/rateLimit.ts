import { prisma } from './prisma.js'

export interface RateLimitResult {
  allowed: boolean
  /// Seconds until the window resets (only meaningful when !allowed).
  retryAfterSec: number
}

/// Consume one unit against a fixed-window counter identified by `key`.
///
/// Persisted in the DB so the limit holds across serverless invocations (an
/// in-memory limiter is useless when each request may hit a fresh instance).
/// Returns whether the call is allowed and, if not, how long until the window
/// resets. Fail-open: if the store misbehaves, the request is allowed rather
/// than blocking legitimate users.
export async function consumeRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): Promise<RateLimitResult> {
  const now = Date.now()
  try {
    const existing = await prisma.rateLimit.findUnique({ where: { key } })

    // No window yet, or the previous window has expired: start a fresh one.
    if (!existing || existing.expiresAt.getTime() <= now) {
      const expiresAt = new Date(now + windowMs)
      await prisma.rateLimit.upsert({
        where: { key },
        create: { key, count: 1, expiresAt },
        update: { count: 1, expiresAt },
      })
      return { allowed: true, retryAfterSec: 0 }
    }

    // Window active and limit reached: deny.
    if (existing.count >= limit) {
      return {
        allowed: false,
        retryAfterSec: Math.max(1, Math.ceil((existing.expiresAt.getTime() - now) / 1000)),
      }
    }

    // Window active with headroom: count this hit.
    await prisma.rateLimit.update({ where: { key }, data: { count: { increment: 1 } } })
    return { allowed: true, retryAfterSec: 0 }
  } catch {
    // Never let a rate-limit store error take down the endpoint.
    return { allowed: true, retryAfterSec: 0 }
  }
}

/// Best-effort cleanup of expired counter rows (called from maintenance).
export async function purgeExpiredRateLimits(): Promise<number> {
  const res = await prisma.rateLimit.deleteMany({ where: { expiresAt: { lt: new Date() } } })
  return res.count
}

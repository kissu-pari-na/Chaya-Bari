import type { Request, Response, NextFunction } from 'express'
import { consumeRateLimit } from '../lib/rateLimit.js'

/// Best-effort per-IP throttle for a group of sensitive endpoints (login,
/// register, resend). Blunts brute-force and mass-abuse from one source. The
/// email-address throttle in the auth service is the primary, IP-independent
/// guard; this is defence in depth. Fail-open by design.
export function rateLimitByIp(bucket: string, limit: number, windowMs: number) {
  return (req: Request, res: Response, next: NextFunction) => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown'
    void consumeRateLimit(`${bucket}:${ip}`, limit, windowMs).then((result) => {
      if (result.allowed) {
        next()
        return
      }
      res.setHeader('Retry-After', String(result.retryAfterSec))
      res.status(429).json({
        error: 'Too many requests. Please slow down and try again shortly.',
        code: 'RATE_LIMITED',
      })
    })
  }
}

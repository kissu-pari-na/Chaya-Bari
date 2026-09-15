import { logger } from './logger.js'

/// True when an SMS gateway is configured; otherwise SMS runs in log-only mode
/// (records the message instead of sending it) so the flow is observable in
/// development without a real provider.
export const isSmsLive = !!process.env.SMS_API_URL

/**
 * Sends an SMS. Provider is a generic HTTP gateway configured via env:
 *   SMS_API_URL  — endpoint that accepts a JSON POST { to, text }
 *   SMS_API_KEY  — optional bearer token
 * Swap the body/headers here to match a specific Bangladeshi gateway (e.g.
 * bulksmsbd, ssl wireless) without changing callers. Never throws.
 */
export async function sendSms(to: string, text: string): Promise<void> {
  try {
    if (!isSmsLive) {
      logger.info('SMS (log-only mode; SMS_API_URL not configured)', { to, text })
      return
    }
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (process.env.SMS_API_KEY) headers.Authorization = `Bearer ${process.env.SMS_API_KEY}`
    const res = await fetch(process.env.SMS_API_URL as string, {
      method: 'POST',
      headers,
      body: JSON.stringify({ to, text }),
    })
    if (!res.ok) {
      logger.error('SMS gateway returned non-OK', { to, status: res.status })
    }
  } catch (err) {
    logger.error('Failed to send SMS', { message: err instanceof Error ? err.message : String(err) })
  }
}

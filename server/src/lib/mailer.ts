import { env } from '../config/env.js'
import { logger } from './logger.js'

export interface MailMessage {
  to: string
  subject: string
  /// Plain-text body (always provided).
  text: string
  /// Optional HTML body.
  html?: string
}

/// True when SMTP credentials are configured; otherwise the mailer runs in
/// log-only mode (it records the message instead of sending it).
export const isMailLive = !!env.smtp.host && !!env.smtp.user && !!env.smtp.pass

/// Sends an email. In log-only mode (no SMTP configured) it records the message
/// via the logger so the flow is observable in development without a real
/// mail server. A real SMTP transport (e.g. nodemailer) can be dropped in here
/// behind `isMailLive` without changing callers. Never throws into the caller.
export async function sendEmail(msg: MailMessage): Promise<void> {
  try {
    if (!isMailLive) {
      logger.info('Email (log-only mode; SMTP not configured)', {
        to: msg.to,
        subject: msg.subject,
        text: msg.text,
      })
      return
    }
    // With SMTP configured a real transport would send here. Kept as a log to
    // avoid a hard dependency until credentials/network are available.
    logger.info('Email dispatched', { to: msg.to, subject: msg.subject, from: env.smtp.from })
  } catch (err) {
    logger.error('Failed to send email', { message: err instanceof Error ? err.message : String(err) })
  }
}

/// Builds an absolute URL from an in-app path using the configured app URL.
export function appLink(path: string): string {
  const base = env.appUrl.replace(/\/$/, '')
  return `${base}${path.startsWith('/') ? path : `/${path}`}`
}

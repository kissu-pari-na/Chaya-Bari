import nodemailer, { type Transporter } from 'nodemailer'
import { env } from '../config/env.js'
import { logger } from './logger.js'

export interface MailAttachment {
  filename: string
  content: Buffer
  /// Content-ID for referencing the attachment inline from the HTML as
  /// `<img src="cid:...">`.
  cid?: string
}

export interface MailMessage {
  to: string
  subject: string
  /// Plain-text body (always provided).
  text: string
  /// Optional HTML body.
  html?: string
  /// Optional attachments (e.g. an inline logo referenced by cid).
  attachments?: MailAttachment[]
}

/// True when SMTP credentials are configured; otherwise the mailer runs in
/// log-only mode (it records the message instead of sending it).
export const isMailLive = !!env.smtp.host && !!env.smtp.user && !!env.smtp.pass

// A single reused SMTP transport (created lazily on first send). Port 465 is
// implicit TLS; anything else (typically 587) uses STARTTLS.
let transporter: Transporter | null = null
function getTransport(): Transporter {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.smtp.host,
      port: env.smtp.port,
      secure: env.smtp.port === 465,
      auth: { user: env.smtp.user, pass: env.smtp.pass },
    })
  }
  return transporter
}

/// Sends an email. In log-only mode (no SMTP configured) it records the message
/// via the logger so the flow is observable in development without a real mail
/// server. With SMTP configured it sends over a reused nodemailer transport.
/// Errors are logged, not thrown into the caller.
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
    await getTransport().sendMail({
      from: env.smtp.from,
      to: msg.to,
      subject: msg.subject,
      text: msg.text,
      html: msg.html,
      attachments: msg.attachments,
    })
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

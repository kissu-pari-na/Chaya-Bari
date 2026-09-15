import { createHash } from 'node:crypto'
import type { Role, User, VerificationChannel } from '@prisma/client'
import { prisma } from '../../lib/prisma.js'
import { env } from '../../config/env.js'
import { sendEmail } from '../../lib/mailer.js'
import { emailLogoBase64 } from '../../lib/emailLogo.js'
import { HttpError } from '../../utils/httpError.js'

const CODE_TTL_MS = 10 * 60 * 1000 // 10 minutes
const MAX_ATTEMPTS = 5
const BRAND = 'Chaya Bari'

function generateCode(): string {
  // 6-digit numeric, zero-padded.
  return String(Math.floor(100000 + Math.random() * 900000))
}

// Codes are short-lived and rate-limited, so a fast keyed SHA-256 (peppered
// with the JWT secret) is sufficient and constant-cost to compare.
function hashCode(code: string): string {
  return createHash('sha256').update(`${code}:${env.jwtSecret}`).digest('hex')
}

/// Create a fresh code for a channel, invalidating any previous unused ones.
async function issueCode(userId: string, channel: VerificationChannel): Promise<string> {
  const code = generateCode()
  await prisma.verificationCode.deleteMany({ where: { userId, channel, consumedAt: null } })
  await prisma.verificationCode.create({
    data: {
      userId,
      channel,
      codeHash: hashCode(code),
      expiresAt: new Date(Date.now() + CODE_TTL_MS),
    },
  })
  return code
}

// ---- Emails ----

function appLink(path: string): string {
  const base = env.appUrl.replace(/\/$/, '')
  return `${base}${path.startsWith('/') ? path : `/${path}`}`
}

function logoAttachment() {
  return [{ filename: 'chaya-bari.png', content: Buffer.from(emailLogoBase64, 'base64'), cid: 'logo' }]
}

const font = "font-family:'Segoe UI',Arial,sans-serif"

/// Branded card wrapper shared by every transactional email. `inner` is the
/// body cell HTML. Email clients need table layout + inline styles.
function emailShell(inner: string): string {
  return `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#f4f1ea;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f1ea;padding:24px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 6px 24px rgba(0,0,0,0.08);">
            <tr>
              <td style="background:linear-gradient(135deg,#ea342c,#d0241d);padding:26px 24px;text-align:center;">
                <img src="cid:logo" alt="ছায়া বাড়ি — Chaya Bari" height="56" style="height:56px;width:auto;display:inline-block;border:0;outline:none;text-decoration:none;" />
                <div style="font-size:12px;color:#ffe6b8;${font};letter-spacing:3px;text-transform:uppercase;margin-top:8px;">Chaya Bari</div>
              </td>
            </tr>
            <tr>
              <td style="padding:32px 28px 8px;${font};color:#2b2b2b;">${inner}</td>
            </tr>
            <tr>
              <td style="padding:12px 28px 28px;${font};">
                <hr style="border:none;border-top:1px solid #eee;margin:0 0 16px;" />
                <p style="margin:0;font-size:12px;color:#bbb;">© ছায়া বাড়ি · Homemade with care</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`
}

function digitsHtml(code: string): string {
  return code
    .split('')
    .map(
      (d) =>
        `<span style="display:inline-block;min-width:34px;margin:0 4px;padding:12px 0;background:#fff7ea;border:1px solid #f0d9a8;border-radius:10px;font-size:28px;font-weight:700;letter-spacing:2px;color:#8a1a15;${font};">${d}</span>`,
    )
    .join('')
}

function buttonHtml(url: string, label: string): string {
  return `<a href="${url}" style="display:inline-block;background:#ea342c;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:700;font-size:15px;${font};">${label}</a>`
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function roleLabel(role: Role): string {
  if (role === 'ADMIN') return 'Administrator'
  if (role === 'KITCHEN') return 'Kitchen staff'
  return 'Customer'
}

export async function sendEmailCode(user: User): Promise<void> {
  const code = await issueCode(user.id, 'EMAIL')
  const greeting = user.name ? escapeHtml(user.name) : 'there'
  const inner = `
    <p style="margin:0 0 8px;font-size:16px;">Hi ${greeting},</p>
    <p style="margin:0 0 20px;font-size:15px;line-height:1.5;color:#555;">Use the code below to confirm your email and finish setting up your ${BRAND} account.</p>
    <div style="text-align:center;margin:8px 0 18px;">${digitsHtml(code)}</div>
    <p style="margin:0 0 18px;font-size:13px;color:#888;text-align:center;">This code expires in <strong style="color:#d0241d;">10 minutes</strong>.</p>
    <div style="text-align:center;margin:0 0 14px;">${buttonHtml(appLink('/verify-email'), 'Confirm email')}</div>
    <p style="margin:0;font-size:12px;line-height:1.5;color:#999;">Open the confirmation page, enter your email (<strong>${escapeHtml(user.email)}</strong>) and the code above. If you didn't expect this email, you can safely ignore it.</p>`
  await sendEmail({
    to: user.email,
    subject: `${code} is your ${BRAND} confirmation code`,
    text:
      `Your ${BRAND} email confirmation code is ${code}.\n` +
      `Confirm at ${appLink('/verify-email')} (email: ${user.email}).\n` +
      `It expires in 10 minutes. If you didn't expect this, you can ignore this email.`,
    html: emailShell(inner),
    attachments: logoAttachment(),
  })
}

/// Sent once an account's email is confirmed: a welcome with account + login
/// details (never the password).
export async function sendWelcomeEmail(user: User): Promise<void> {
  const greeting = user.name ? escapeHtml(user.name) : 'there'
  const inner = `
    <p style="margin:0 0 8px;font-size:16px;">Hi ${greeting},</p>
    <p style="margin:0 0 18px;font-size:15px;line-height:1.5;color:#555;">Your ${BRAND} account is confirmed and ready to use. Here are your account details:</p>
    <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;margin:0 0 20px;font-size:14px;color:#2b2b2b;">
      <tr><td style="padding:6px 0;color:#888;width:90px;">Name</td><td style="padding:6px 0;font-weight:600;">${escapeHtml(user.name)}</td></tr>
      <tr><td style="padding:6px 0;color:#888;">Email</td><td style="padding:6px 0;font-weight:600;">${escapeHtml(user.email)}</td></tr>
      <tr><td style="padding:6px 0;color:#888;">Role</td><td style="padding:6px 0;font-weight:600;">${roleLabel(user.role)}</td></tr>
    </table>
    <div style="text-align:center;margin:0 0 16px;">${buttonHtml(appLink('/login'), 'Log in')}</div>
    <p style="margin:0;font-size:12px;line-height:1.5;color:#999;">If you don't have your password (for example, an account created for you by our team), use <strong>“Forgot password”</strong> on the login page to set one.</p>`
  await sendEmail({
    to: user.email,
    subject: `Welcome to ${BRAND} — your account is ready`,
    text:
      `Hi ${user.name}, your ${BRAND} account is confirmed.\n` +
      `Email: ${user.email}\nRole: ${roleLabel(user.role)}\n` +
      `Log in at ${appLink('/login')}. If you don't have your password, use "Forgot password" on the login page.`,
    html: emailShell(inner),
    attachments: logoAttachment(),
  })
}

/// Sent when an admin creates an account for someone. Includes the initial
/// password the admin set (the recipient has no other way to know it) plus the
/// email-confirmation code needed to activate the account. Only used for
/// admin-provisioned accounts — self-registered users choose their own password
/// and never receive it by email.
export async function sendAdminCreatedEmail(user: User, password: string): Promise<void> {
  const code = await issueCode(user.id, 'EMAIL')
  const greeting = user.name ? escapeHtml(user.name) : 'there'
  const inner = `
    <p style="margin:0 0 8px;font-size:16px;">Hi ${greeting},</p>
    <p style="margin:0 0 18px;font-size:15px;line-height:1.5;color:#555;">An account has been created for you at ${BRAND}. Here are your sign-in details:</p>
    <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;margin:0 0 14px;font-size:14px;color:#2b2b2b;">
      <tr><td style="padding:6px 0;color:#888;width:90px;">Name</td><td style="padding:6px 0;font-weight:600;">${escapeHtml(user.name)}</td></tr>
      <tr><td style="padding:6px 0;color:#888;">Email</td><td style="padding:6px 0;font-weight:600;">${escapeHtml(user.email)}</td></tr>
      <tr><td style="padding:6px 0;color:#888;">Role</td><td style="padding:6px 0;font-weight:600;">${roleLabel(user.role)}</td></tr>
      <tr><td style="padding:6px 0;color:#888;">Password</td><td style="padding:6px 0;"><span style="display:inline-block;background:#fff7ea;border:1px solid #f0d9a8;border-radius:8px;padding:6px 12px;font-weight:700;font-size:15px;color:#8a1a15;letter-spacing:1px;">${escapeHtml(password)}</span></td></tr>
    </table>
    <p style="margin:0 0 12px;font-size:14px;line-height:1.5;color:#555;">First, confirm your email to activate the account — enter this code on the confirmation page:</p>
    <div style="text-align:center;margin:8px 0 16px;">${digitsHtml(code)}</div>
    <div style="text-align:center;margin:0 0 16px;">${buttonHtml(appLink('/verify-email'), 'Confirm email')}</div>
    <p style="margin:0;font-size:12px;line-height:1.5;color:#999;">For your security, change this password after your first login using <strong>“Forgot password”</strong> on the login page. If you weren't expecting this account, please ignore this email.</p>`
  await sendEmail({
    to: user.email,
    subject: `Your ${BRAND} account details`,
    text:
      `Hi ${user.name}, an account has been created for you at ${BRAND}.\n` +
      `Email: ${user.email}\nRole: ${roleLabel(user.role)}\nPassword: ${password}\n\n` +
      `Confirm your email to activate: ${appLink('/verify-email')} — code ${code} (expires in 10 minutes).\n` +
      `Please change your password after your first login using "Forgot password".`,
    html: emailShell(inner),
    attachments: logoAttachment(),
  })
}

/// Sent when a password reset is requested.
export async function sendPasswordResetCode(user: User): Promise<void> {
  const code = await issueCode(user.id, 'PASSWORD_RESET')
  const greeting = user.name ? escapeHtml(user.name) : 'there'
  const inner = `
    <p style="margin:0 0 8px;font-size:16px;">Hi ${greeting},</p>
    <p style="margin:0 0 20px;font-size:15px;line-height:1.5;color:#555;">We received a request to reset your ${BRAND} password. Use the code below to set a new one.</p>
    <div style="text-align:center;margin:8px 0 18px;">${digitsHtml(code)}</div>
    <p style="margin:0 0 18px;font-size:13px;color:#888;text-align:center;">This code expires in <strong style="color:#d0241d;">10 minutes</strong>.</p>
    <div style="text-align:center;margin:0 0 14px;">${buttonHtml(appLink('/forgot-password'), 'Reset password')}</div>
    <p style="margin:0;font-size:12px;line-height:1.5;color:#999;">If you didn't request a password reset, you can safely ignore this email — your password won't change.</p>`
  await sendEmail({
    to: user.email,
    subject: `${code} is your ${BRAND} password reset code`,
    text:
      `Your ${BRAND} password reset code is ${code}.\n` +
      `Reset at ${appLink('/forgot-password')} (email: ${user.email}).\n` +
      `It expires in 10 minutes. If you didn't request this, you can ignore this email.`,
    html: emailShell(inner),
    attachments: logoAttachment(),
  })
}

/// Validate a submitted code for a channel. On success marks it consumed and
/// returns true; on a wrong/expired code it throws a 400 (counting attempts).
export async function consumeCode(userId: string, channel: VerificationChannel, code: string): Promise<void> {
  const record = await prisma.verificationCode.findFirst({
    where: { userId, channel, consumedAt: null },
    orderBy: { createdAt: 'desc' },
  })
  if (!record) throw HttpError.badRequest('No pending code. Please request a new one.')
  if (record.expiresAt.getTime() < Date.now()) {
    throw HttpError.badRequest('Code expired. Please request a new one.')
  }
  if (record.attempts >= MAX_ATTEMPTS) {
    throw HttpError.badRequest('Too many attempts. Please request a new code.')
  }
  if (record.codeHash !== hashCode(code)) {
    await prisma.verificationCode.update({
      where: { id: record.id },
      data: { attempts: { increment: 1 } },
    })
    throw HttpError.badRequest('Incorrect code.')
  }
  await prisma.verificationCode.update({
    where: { id: record.id },
    data: { consumedAt: new Date() },
  })
}

import { createHash } from 'node:crypto'
import type { User, VerificationChannel } from '@prisma/client'
import { prisma } from '../../lib/prisma.js'
import { env } from '../../config/env.js'
import { sendEmail } from '../../lib/mailer.js'
import { emailLogoBase64 } from '../../lib/emailLogo.js'
import { HttpError } from '../../utils/httpError.js'

const CODE_TTL_MS = 10 * 60 * 1000 // 10 minutes
const MAX_ATTEMPTS = 5

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

export async function sendEmailCode(user: User): Promise<void> {
  const code = await issueCode(user.id, 'EMAIL')
  await sendEmail({
    to: user.email,
    subject: `${code} is your ${brand()} confirmation code`,
    text:
      `Your ${brand()} email confirmation code is ${code}.\n` +
      `It expires in 10 minutes. If you didn't create an account, you can ignore this email.`,
    html: codeEmailHtml(user.name, code),
    // Inline logo referenced as `cid:logo` from the HTML header.
    attachments: [{ filename: 'chaya-bari.png', content: Buffer.from(emailLogoBase64, 'base64'), cid: 'logo' }],
  })
}

function brand(): string {
  return 'Chaya Bari'
}

// Brand palette (matches the app): red gradient + gold accent on a cream card.
// Email clients need table layout + inline styles, so this is deliberately
// verbose rather than using the app's CSS.
function codeEmailHtml(name: string, code: string): string {
  const greeting = name ? escapeHtml(name) : 'there'
  const digits = code
    .split('')
    .map(
      (d) =>
        `<span style="display:inline-block;min-width:34px;margin:0 4px;padding:12px 0;background:#fff7ea;border:1px solid #f0d9a8;border-radius:10px;font-size:28px;font-weight:700;letter-spacing:2px;color:#8a1a15;font-family:'Segoe UI',Arial,sans-serif;">${d}</span>`,
    )
    .join('')
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
                <div style="font-size:12px;color:#ffe6b8;font-family:'Segoe UI',Arial,sans-serif;letter-spacing:3px;text-transform:uppercase;margin-top:8px;">Chaya Bari</div>
              </td>
            </tr>
            <tr>
              <td style="padding:32px 28px 8px;font-family:'Segoe UI',Arial,sans-serif;color:#2b2b2b;">
                <p style="margin:0 0 8px;font-size:16px;">Hi ${greeting},</p>
                <p style="margin:0 0 20px;font-size:15px;line-height:1.5;color:#555;">Use the code below to confirm your email and finish setting up your account.</p>
                <div style="text-align:center;margin:8px 0 18px;">${digits}</div>
                <p style="margin:0 0 4px;font-size:13px;color:#888;text-align:center;">This code expires in <strong style="color:#d0241d;">10 minutes</strong>.</p>
              </td>
            </tr>
            <tr>
              <td style="padding:12px 28px 28px;font-family:'Segoe UI',Arial,sans-serif;">
                <hr style="border:none;border-top:1px solid #eee;margin:0 0 16px;" />
                <p style="margin:0;font-size:12px;line-height:1.5;color:#999;">If you didn't create a Chaya Bari account, you can safely ignore this email — no changes will be made.</p>
                <p style="margin:12px 0 0;font-size:12px;color:#bbb;">© ছায়া বাড়ি · Homemade with care</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
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

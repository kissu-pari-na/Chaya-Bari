// Account and transactional email templates. Sign-in is Google only (vault
// D-AUTH-004), so there are no confirmation codes or password emails: Google
// proves the address when its owner signs in.
import type { Role, User } from '@prisma/client'
import { env } from '../../config/env.js'
import { sendEmail } from '../../lib/mailer.js'
import { emailLogoBase64 } from '../../lib/emailLogo.js'

const BRAND = 'Chaya Bari'

// ---- Emails ----

function appLink(path: string): string {
  const base = env.appUrl.replace(/\/$/, '')
  return `${base}${path.startsWith('/') ? path : `/${path}`}`
}

export function logoAttachment() {
  return [{ filename: 'chaya-bari.png', content: Buffer.from(emailLogoBase64, 'base64'), cid: 'logo' }]
}

const font = "font-family:'Segoe UI',Arial,sans-serif"

/// Branded card wrapper shared by every transactional email. `inner` is the
/// body cell HTML. Email clients need table layout + inline styles.
export function emailShell(inner: string): string {
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

export function buttonHtml(url: string, label: string, variant: 'primary' | 'gold' = 'primary'): string {
  const bg = variant === 'gold' ? '#f5b300' : '#ea342c'
  const fg = variant === 'gold' ? '#3a2a00' : '#ffffff'
  return `<a href="${url}" style="display:inline-block;background:${bg};color:${fg};text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:700;font-size:15px;${font};">${label}</a>`
}

export function escapeHtml(s: string): string {
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

/// Sent when an admin creates an account for someone. There is nothing to
/// confirm and no password: the person signs in with the Google account that
/// uses this email, which confirms the account on first sign-in.
export async function sendAdminCreatedEmail(user: User): Promise<void> {
  const greeting = user.name ? escapeHtml(user.name) : 'there'
  const inner = `
    <p style="margin:0 0 8px;font-size:16px;">Hi ${greeting},</p>
    <p style="margin:0 0 18px;font-size:15px;line-height:1.5;color:#555;">An account has been created for you at ${BRAND}. Here are your account details:</p>
    <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;margin:0 0 14px;font-size:14px;color:#2b2b2b;">
      <tr><td style="padding:6px 0;color:#888;width:90px;">Name</td><td style="padding:6px 0;font-weight:600;">${escapeHtml(user.name)}</td></tr>
      <tr><td style="padding:6px 0;color:#888;">Email</td><td style="padding:6px 0;font-weight:600;">${escapeHtml(user.email)}</td></tr>
      <tr><td style="padding:6px 0;color:#888;">Role</td><td style="padding:6px 0;font-weight:600;">${roleLabel(user.role)}</td></tr>
    </table>
    <p style="margin:0 0 16px;font-size:14px;line-height:1.5;color:#555;">Sign in with the <strong>Google account for ${escapeHtml(user.email)}</strong>. There is no password to remember.</p>
    <div style="text-align:center;margin:0 0 16px;">${buttonHtml(appLink('/login'), 'Sign in with Google')}</div>
    <p style="margin:0;font-size:12px;line-height:1.5;color:#999;">If you weren't expecting this account, you can ignore this email.</p>`
  await sendEmail({
    to: user.email,
    subject: `Your ${BRAND} account is ready`,
    text:
      `Hi ${user.name}, an account has been created for you at ${BRAND}.
` +
      `Email: ${user.email}
Role: ${roleLabel(user.role)}

` +
      `Sign in at ${appLink('/login')} with the Google account for ${user.email}. There is no password.`,
    html: emailShell(inner),
    attachments: logoAttachment(),
  })
}

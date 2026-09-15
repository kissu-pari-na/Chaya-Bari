import type { Role, User } from '@prisma/client'
import { prisma } from '../../lib/prisma.js'
import { hashPassword, verifyPassword } from '../../utils/password.js'
import { signAuthToken } from '../../utils/jwt.js'
import { HttpError } from '../../utils/httpError.js'
import type {
  ForgotPasswordInput,
  LoginInput,
  RegisterInput,
  ResendEmailInput,
  ResetPasswordInput,
  VerifyEmailInput,
} from './auth.schemas.js'
import { consumeCode, sendEmailCode, sendPasswordResetCode, sendWelcomeEmail } from './verification.service.js'
import { consumeRateLimit } from '../../lib/rateLimit.js'

// Throttle how often a confirmation email may be sent to one address, so nobody
// can spam a stranger's inbox by repeatedly registering or resending. A short
// cooldown blocks rapid repeats; an hourly cap bounds the total.
async function assertEmailSendAllowed(email: string): Promise<void> {
  const key = email.toLowerCase()
  const cooldown = await consumeRateLimit(`email-code-cooldown:${key}`, 1, 60_000)
  if (!cooldown.allowed) {
    throw new HttpError(
      429,
      `Please wait ${cooldown.retryAfterSec}s before requesting another code`,
      undefined,
      'RATE_LIMITED',
    )
  }
  const hourly = await consumeRateLimit(`email-code-hourly:${key}`, 5, 60 * 60_000)
  if (!hourly.allowed) {
    throw new HttpError(
      429,
      'Too many code requests for this email. Please try again later.',
      undefined,
      'RATE_LIMITED',
    )
  }
}

export interface PublicUser {
  id: string
  name: string
  email: string
  phone: string | null
  role: Role
  emailVerified: boolean
}

function toPublicUser(user: User): PublicUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    emailVerified: user.emailVerifiedAt != null,
  }
}

function looksLikeEmail(identifier: string): boolean {
  return identifier.includes('@')
}

/// Public self-registration: always a CUSTOMER, created unconfirmed. A phone
/// number is required for delivery/contact but is not verified. The account is
/// confirmed by email, so an email code is sent and no token is returned here.
///
/// Only a *confirmed* account reserves an email or phone. An unconfirmed
/// account never proves ownership of its email, so it must not permanently
/// block anyone: if the email or phone is currently held only by unconfirmed
/// accounts, those are cleared and this registration takes over. This prevents
/// "squatting", where someone registers with a stranger's email, never
/// confirms, and locks the real owner out forever.
export async function register(
  input: RegisterInput,
): Promise<{ user: PublicUser; requiresEmailVerification: true }> {
  // Throttle before any writes so a spammer can't even create churn.
  await assertEmailSendAllowed(input.email)

  const verifiedEmail = await prisma.user.findFirst({
    where: { email: input.email, emailVerifiedAt: { not: null } },
  })
  if (verifiedEmail) {
    throw HttpError.conflict('An account with this email already exists')
  }
  const verifiedPhone = await prisma.user.findFirst({
    where: { phone: input.phone, emailVerifiedAt: { not: null } },
  })
  if (verifiedPhone) {
    throw HttpError.conflict('An account with this phone number already exists')
  }

  // Release the email/phone from any unconfirmed accounts holding them. These
  // have never been confirmed, so no real owner loses anything; cascades remove
  // their pending codes and empty customer profile.
  await prisma.user.deleteMany({
    where: {
      emailVerifiedAt: null,
      OR: [{ email: input.email }, { phone: input.phone }],
    },
  })

  const passwordHash = await hashPassword(input.password)
  const user = await prisma.user.create({
    data: {
      name: input.name,
      email: input.email,
      phone: input.phone,
      passwordHash,
      role: 'CUSTOMER',
      customer: { create: {} },
    },
  })

  await sendEmailCode(user)

  return { user: toPublicUser(user), requiresEmailVerification: true }
}

/// Confirm the email with the code sent at registration. On success the account
/// becomes usable and a session token is returned (auto-login). Public because
/// it runs before the first login.
export async function verifyEmail(input: VerifyEmailInput): Promise<{ user: PublicUser; token: string }> {
  const user = await prisma.user.findUnique({ where: { email: input.email } })
  if (!user) throw HttpError.badRequest('No account found for this email')
  if (user.emailVerifiedAt == null) {
    await consumeCode(user.id, 'EMAIL', input.code)
    const confirmed = await prisma.user.update({
      where: { id: user.id },
      data: { emailVerifiedAt: new Date() },
    })
    // Welcome self-registered users now that the account is confirmed.
    // Admin-created users (createdById set) already received a full account
    // email with their password at creation, so don't send a duplicate.
    if (confirmed.createdById == null) {
      await sendWelcomeEmail(confirmed)
    }
  }
  const fresh = await prisma.user.findUniqueOrThrow({ where: { id: user.id } })
  return { user: toPublicUser(fresh), token: signAuthToken({ sub: fresh.id, role: fresh.role }) }
}

/// Re-send the email code (before login). Silent about whether the address
/// exists / is already confirmed, to avoid enumeration.
export async function resendEmail(input: ResendEmailInput): Promise<void> {
  // Throttle regardless of whether the account exists, so this can't be used to
  // probe for accounts or to spam an inbox.
  await assertEmailSendAllowed(input.email)
  const user = await prisma.user.findUnique({ where: { email: input.email } })
  if (user && user.emailVerifiedAt == null) {
    await sendEmailCode(user)
  }
}

/// Request a password-reset code. Only a confirmed account can reset (an
/// unconfirmed one is handled by the registration reclaim flow). Silent about
/// whether the account exists, and hard-capped so it can't be used to spam an
/// inbox: at most 2 requests per email in any 2-day window.
export async function forgotPassword(input: ForgotPasswordInput): Promise<void> {
  const email = input.email.toLowerCase()
  const limit = await consumeRateLimit(`pwreset:${email}`, 2, 2 * 24 * 60 * 60_000)
  if (!limit.allowed) {
    throw new HttpError(
      429,
      'Too many password reset requests. Please try again in a couple of days.',
      undefined,
      'RATE_LIMITED',
    )
  }
  const user = await prisma.user.findUnique({ where: { email } })
  if (user && user.emailVerifiedAt != null && user.isActive) {
    await sendPasswordResetCode(user)
  }
}

/// Complete a password reset with the emailed code.
export async function resetPassword(input: ResetPasswordInput): Promise<void> {
  const user = await prisma.user.findUnique({ where: { email: input.email.toLowerCase() } })
  if (!user) throw HttpError.badRequest('No account found for this email')
  await consumeCode(user.id, 'PASSWORD_RESET', input.code)
  const passwordHash = await hashPassword(input.password)
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash } })
}

export async function login(input: LoginInput): Promise<{ user: PublicUser; token: string }> {
  const identifier = input.identifier.trim()
  const byEmail = looksLikeEmail(identifier)
  const user = byEmail
    ? await prisma.user.findUnique({ where: { email: identifier.toLowerCase() } })
    : await prisma.user.findFirst({ where: { phone: identifier } })

  if (!user || !user.isActive) {
    throw HttpError.unauthorized('Invalid credentials')
  }
  const ok = await verifyPassword(input.password, user.passwordHash)
  if (!ok) {
    throw HttpError.unauthorized('Invalid credentials')
  }

  // Email confirmation is mandatory for the account to be usable, whichever
  // identifier was used to log in.
  if (user.emailVerifiedAt == null) {
    throw new HttpError(403, 'Please confirm your email to continue', undefined, 'EMAIL_UNVERIFIED')
  }

  return { user: toPublicUser(user), token: signAuthToken({ sub: user.id, role: user.role }) }
}

/// Delete never-confirmed accounts older than `olderThanHours`. These have no
/// proven owner and (since they can't log in) no orders or reviews, so removing
/// them keeps pending rows from piling up and frees any email/phone they held.
/// Cascades clear their codes and empty customer profile.
export async function expireUnverifiedAccounts(olderThanHours = 48): Promise<number> {
  const cutoff = new Date(Date.now() - olderThanHours * 60 * 60_000)
  const res = await prisma.user.deleteMany({
    where: { emailVerifiedAt: null, createdAt: { lt: cutoff } },
  })
  return res.count
}

export async function getCurrentUser(userId: string): Promise<PublicUser> {
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) throw HttpError.notFound('User not found')
  return toPublicUser(user)
}

import { randomBytes } from 'node:crypto'
import type { Role, User } from '@prisma/client'
import { prisma } from '../../lib/prisma.js'
import { hashPassword, verifyPassword } from '../../utils/password.js'
import { signAuthToken } from '../../utils/jwt.js'
import { HttpError } from '../../utils/httpError.js'
import { verifyGoogleIdToken } from '../../lib/googleAuth.js'
import type {
  ForgotPasswordInput,
  GoogleAuthInput,
  LoginInput,
  RegisterInput,
  ResendEmailInput,
  ResetPasswordInput,
  UpdateProfileInput,
  VerifyEmailInput,
} from './auth.schemas.js'
import { consumeCode, sendEmailCode, sendPasswordResetCode, sendWelcomeEmail } from './verification.service.js'
import { ensureOrbitaxDefaultAddress } from '../orders/address.service.js'
import { consumeRateLimit } from '../../lib/rateLimit.js'
import { activateAccount, releasePhoneFromPlaceholders } from '../customers/customer-account.service.js'

// A single per-recipient email budget shared by EVERY user-triggered send
// (registration codes, resends, and password-reset codes), so one address can't
// be spammed no matter which endpoint is used. The ceilings sit far above what a
// legitimate user ever needs, so real users are never affected:
//   • at least 60s between emails (blocks rapid repeats)
//   • at most 4 per hour
//   • at most 8 per day
// System/lifecycle emails (the welcome and the admin-created account email) are
// not user-triggerable and deliberately bypass this so they always arrive.
async function assertEmailSendAllowed(email: string): Promise<void> {
  const key = email.toLowerCase()
  const cooldown = await consumeRateLimit(`email:cooldown:${key}`, 1, 60_000)
  if (!cooldown.allowed) {
    throw new HttpError(
      429,
      `Please wait ${cooldown.retryAfterSec}s before requesting another email`,
      undefined,
      'RATE_LIMITED',
    )
  }
  const hourly = await consumeRateLimit(`email:hour:${key}`, 4, 60 * 60_000)
  if (!hourly.allowed) {
    throw new HttpError(
      429,
      'Too many email requests for this address. Please try again later.',
      undefined,
      'RATE_LIMITED',
    )
  }
  const daily = await consumeRateLimit(`email:day:${key}`, 8, 24 * 60 * 60_000)
  if (!daily.allowed) {
    throw new HttpError(
      429,
      'Daily email limit reached for this address. Please try again tomorrow.',
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
  createdAt: string
}

function toPublicUser(user: User): PublicUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    emailVerified: user.emailVerifiedAt != null,
    createdAt: user.createdAt.toISOString(),
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
///
/// If an admin already ordered on behalf of this email, the placeholder account
/// is reused (never deleted): the registration details are written onto it and,
/// once the email is confirmed, the owner has all of its orders.
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
  // their pending codes and empty customer profile. Placeholders are kept (they
  // own orders) and only give up a borrowed phone number.
  await prisma.user.deleteMany({
    where: {
      emailVerifiedAt: null,
      isPlaceholder: false,
      OR: [{ email: input.email }, { phone: input.phone }],
    },
  })
  await releasePhoneFromPlaceholders(input.phone, input.email)

  const passwordHash = await hashPassword(input.password)
  const placeholder = await prisma.user.findFirst({ where: { email: input.email, isPlaceholder: true } })
  const user = placeholder
    ? await prisma.user.update({
        where: { id: placeholder.id },
        data: { name: input.name, phone: input.phone, passwordHash },
        include: { customer: true },
      })
    : await prisma.user.create({
        data: {
          name: input.name,
          email: input.email,
          phone: input.phone,
          passwordHash,
          role: 'CUSTOMER',
          customer: { create: {} },
        },
        include: { customer: true },
      })

  // Orbitax staff get their office address pre-filled as the default (no-op for
  // other domains). Never let this block registration if it fails.
  if (user.customer) {
    await ensureOrbitaxDefaultAddress(user.customer.id, user).catch(() => {})
  }

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
    // Confirms the email, and takes over any orders placed for it (by an admin
    // on the owner's behalf, or as a guest).
    const confirmed = await activateAccount(user.id)
    // Welcome the user now that the account is confirmed. This is where the
    // "Set your own password" link becomes usable (it needs a confirmed email),
    // so admin-created users get it here too — one-time, not an abuse vector.
    await sendWelcomeEmail(confirmed)
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
/// unconfirmed one is handled by the registration reclaim flow) — plus a
/// placeholder an admin opened for this email, where resetting is how the owner
/// activates it and sets their first password. Silent about
/// whether the account exists, and hard-capped so it can't be used to spam an
/// inbox: at most 2 requests per email in any 2-day window.
export async function forgotPassword(input: ForgotPasswordInput): Promise<void> {
  const email = input.email.toLowerCase()
  // Same shared per-recipient email budget as registration/resend, so reset
  // requests can't be used to spam an inbox and can't exceed the address's
  // overall daily email ceiling.
  await assertEmailSendAllowed(email)
  const user = await prisma.user.findUnique({ where: { email } })
  if (user && (user.emailVerifiedAt != null || user.isPlaceholder) && user.isActive) {
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
  // The emailed code proves ownership, so this also activates a placeholder.
  if (user.isPlaceholder) await activateAccount(user.id)
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

/// Sign in (or register) with a Google account. The browser obtains a Google
/// ID token via Google Identity Services and sends it here; we verify it against
/// Google's public keys and then either log the matching account in or create a
/// new CUSTOMER on the spot.
///
/// Because Google asserts ownership of a verified email, a Google sign-in for an
/// existing address is the same person: we log them in (and confirm their email
/// if it was still pending) without touching their role. A brand-new address
/// creates a confirmed account immediately — no email code round-trip — which is
/// the whole point of the smoother sign-up. The account has no usable password
/// until the user sets one via "forgot password"; a random hash fills the column
/// so password login can't succeed by accident in the meantime.
export async function loginWithGoogle(input: GoogleAuthInput): Promise<{ user: PublicUser; token: string }> {
  const profile = await verifyGoogleIdToken(input.credential)
  if (!profile.emailVerified) {
    throw HttpError.badRequest('Your Google account email is not verified')
  }
  const email = profile.email.toLowerCase()

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    if (!existing.isActive) throw HttpError.unauthorized('This account has been disabled')
    // Confirm a pending email / take over a placeholder (and its orders).
    const user =
      existing.emailVerifiedAt == null || existing.isPlaceholder ? await activateAccount(existing.id) : existing
    return { user: toPublicUser(user), token: signAuthToken({ sub: user.id, role: user.role }) }
  }

  // New account. Clear any unconfirmed squatters holding this email (they never
  // proved ownership; Google just did), then create a confirmed customer.
  await prisma.user.deleteMany({ where: { emailVerifiedAt: null, isPlaceholder: false, email } })
  const passwordHash = await hashPassword(randomBytes(32).toString('hex'))
  const name = profile.name.trim() || email.split('@')[0]
  const user = await prisma.user.create({
    data: {
      name,
      email,
      passwordHash,
      role: 'CUSTOMER',
      emailVerifiedAt: new Date(),
      customer: { create: {} },
    },
    include: { customer: true },
  })
  // Orbitax staff get their office address pre-filled as the default (no-op for
  // other domains). Never let this block sign-in if it fails.
  if (user.customer) {
    await ensureOrbitaxDefaultAddress(user.customer.id, user).catch(() => {})
  }
  await activateAccount(user.id) // pulls in any guest orders placed with this email
  return { user: toPublicUser(user), token: signAuthToken({ sub: user.id, role: user.role }) }
}

/// Delete never-confirmed accounts older than `olderThanHours`. These have no
/// proven owner and (since they can't log in) no orders or reviews, so removing
/// them keeps pending rows from piling up and frees any email/phone they held.
/// Cascades clear their codes and empty customer profile. Placeholders opened by
/// an admin are kept: they hold orders waiting for their owner.
export async function expireUnverifiedAccounts(olderThanHours = 48): Promise<number> {
  const cutoff = new Date(Date.now() - olderThanHours * 60 * 60_000)
  const res = await prisma.user.deleteMany({
    where: { emailVerifiedAt: null, isPlaceholder: false, createdAt: { lt: cutoff } },
  })
  return res.count
}

export async function getCurrentUser(userId: string): Promise<PublicUser> {
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) throw HttpError.notFound('User not found')
  return toPublicUser(user)
}

/// Update the signed-in user's own profile (name and/or phone). Used mainly to
/// let users add a phone number they didn't provide at sign-up (e.g. Google
/// sign-in). A phone is only reserved by a *confirmed* account, so we reject a
/// phone already held by another confirmed user — mirroring registration.
export async function updateProfile(userId: string, input: UpdateProfileInput): Promise<PublicUser> {
  if (input.phone !== undefined) {
    const clash = await prisma.user.findFirst({
      where: { phone: input.phone, emailVerifiedAt: { not: null }, id: { not: userId } },
    })
    if (clash) {
      throw HttpError.conflict('An account with this phone number already exists')
    }
  }
  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.phone !== undefined ? { phone: input.phone } : {}),
    },
  })
  return toPublicUser(user)
}

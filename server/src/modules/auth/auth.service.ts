import { randomBytes } from 'node:crypto'
import type { Role, User } from '@prisma/client'
import { prisma } from '../../lib/prisma.js'
import { hashPassword } from '../../utils/password.js'
import { signAuthToken } from '../../utils/jwt.js'
import { HttpError } from '../../utils/httpError.js'
import { verifyGoogleIdToken } from '../../lib/googleAuth.js'
import type { GoogleAuthInput, UpdateProfileInput } from './auth.schemas.js'
import { ensureOrbitaxDefaultAddress } from '../orders/address.service.js'
import { activateAccount } from '../customers/customer-account.service.js'

// Sign-in is Google only (vault D-AUTH-004): there are no passwords, email
// codes or password resets. Google proves ownership of the email, so a Google
// sign-in confirms the account and claims any placeholder or guest orders for it.

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

/// Sign in (or register) with a Google account. The browser obtains a Google
/// ID token via Google Identity Services and sends it here; we verify it against
/// Google's public keys and then either log the matching account in or create a
/// new CUSTOMER on the spot.
///
/// Because Google asserts ownership of a verified email, a Google sign-in for an
/// existing address is the same person: we log them in (and confirm their email
/// if it was still pending) without touching their role. A brand-new address
/// creates a confirmed account immediately — no email code round-trip — which is
/// the whole point of the smoother sign-up. The legacy password column is filled
/// with a random hash; there is no password login.
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

/// Delete never-confirmed, self-registered accounts older than `olderThanHours`.
/// Self-registration was retired with password sign-in, so this only clears
/// legacy rows that never confirmed. Accounts an admin created (staff, or
/// customers) are kept: they stay unconfirmed until their owner first signs in
/// with Google, which can take longer than the window. Placeholders are kept too.
export async function expireUnverifiedAccounts(olderThanHours = 48): Promise<number> {
  const cutoff = new Date(Date.now() - olderThanHours * 60 * 60_000)
  const res = await prisma.user.deleteMany({
    where: { emailVerifiedAt: null, isPlaceholder: false, createdById: null, createdAt: { lt: cutoff } },
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
/// phone already held by another confirmed user.
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

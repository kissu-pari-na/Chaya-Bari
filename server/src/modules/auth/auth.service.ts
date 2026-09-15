import type { Role, User } from '@prisma/client'
import { prisma } from '../../lib/prisma.js'
import { hashPassword, verifyPassword } from '../../utils/password.js'
import { signAuthToken } from '../../utils/jwt.js'
import { HttpError } from '../../utils/httpError.js'
import type {
  LoginInput,
  RegisterInput,
  ResendEmailInput,
  VerifyEmailInput,
} from './auth.schemas.js'
import { consumeCode, sendEmailCode } from './verification.service.js'

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
export async function register(
  input: RegisterInput,
): Promise<{ user: PublicUser; requiresEmailVerification: true }> {
  const existingEmail = await prisma.user.findUnique({ where: { email: input.email } })
  if (existingEmail) {
    throw HttpError.conflict('An account with this email already exists')
  }
  const existingPhone = await prisma.user.findFirst({ where: { phone: input.phone } })
  if (existingPhone) {
    throw HttpError.conflict('An account with this phone number already exists')
  }

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
    await prisma.user.update({ where: { id: user.id }, data: { emailVerifiedAt: new Date() } })
  }
  const fresh = await prisma.user.findUniqueOrThrow({ where: { id: user.id } })
  return { user: toPublicUser(fresh), token: signAuthToken({ sub: fresh.id, role: fresh.role }) }
}

/// Re-send the email code (before login). Silent about whether the address
/// exists / is already confirmed, to avoid enumeration.
export async function resendEmail(input: ResendEmailInput): Promise<void> {
  const user = await prisma.user.findUnique({ where: { email: input.email } })
  if (user && user.emailVerifiedAt == null) {
    await sendEmailCode(user)
  }
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

export async function getCurrentUser(userId: string): Promise<PublicUser> {
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) throw HttpError.notFound('User not found')
  return toPublicUser(user)
}

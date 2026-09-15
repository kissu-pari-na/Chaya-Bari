import type { Role, User } from '@prisma/client'
import { prisma } from '../../lib/prisma.js'
import { hashPassword, verifyPassword } from '../../utils/password.js'
import { signAuthToken } from '../../utils/jwt.js'
import { HttpError } from '../../utils/httpError.js'
import type {
  LoginInput,
  RegisterInput,
  ResendPhoneInput,
  VerifyEmailInput,
  VerifyPhoneInput,
} from './auth.schemas.js'
import { consumeCode, sendEmailCode, sendPhoneCode } from './verification.service.js'

export interface PublicUser {
  id: string
  name: string
  email: string
  phone: string | null
  role: Role
  phoneVerified: boolean
  emailVerified: boolean
}

function toPublicUser(user: User): PublicUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    phoneVerified: user.phoneVerifiedAt != null,
    emailVerified: user.emailVerifiedAt != null,
  }
}

function looksLikeEmail(identifier: string): boolean {
  return identifier.includes('@')
}

/// Public self-registration: always a CUSTOMER, created unconfirmed. Phone and
/// email confirmation codes are sent; the account can be used only after the
/// mandatory phone confirmation, so no token is returned here.
export async function register(
  input: RegisterInput,
): Promise<{ user: PublicUser; requiresPhoneVerification: true }> {
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

  // Two separate codes: one to the phone, one to the email.
  await sendPhoneCode(user)
  await sendEmailCode(user)

  return { user: toPublicUser(user), requiresPhoneVerification: true }
}

/// Confirm the phone number with the code sent at registration. On success the
/// account becomes usable and a session token is returned (auto-login).
export async function verifyPhone(input: VerifyPhoneInput): Promise<{ user: PublicUser; token: string }> {
  const user = await prisma.user.findFirst({ where: { phone: input.phone } })
  if (!user) throw HttpError.badRequest('No account found for this phone number')
  await consumeCode(user.id, 'PHONE', input.code)
  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { phoneVerifiedAt: new Date() },
  })
  return { user: toPublicUser(updated), token: signAuthToken({ sub: updated.id, role: updated.role }) }
}

/// Re-send the phone code (before login). Silent about whether the number
/// exists / is already confirmed, to avoid enumeration.
export async function resendPhone(input: ResendPhoneInput): Promise<void> {
  const user = await prisma.user.findFirst({ where: { phone: input.phone } })
  if (user && user.phoneVerifiedAt == null) {
    await sendPhoneCode(user)
  }
}

/// Send an email confirmation code to the signed-in user (they can confirm
/// their email at any time).
export async function sendEmailVerification(userId: string): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) throw HttpError.notFound('User not found')
  if (user.emailVerifiedAt != null) return
  await sendEmailCode(user)
}

/// Confirm the signed-in user's email with the code.
export async function verifyEmail(userId: string, input: VerifyEmailInput): Promise<PublicUser> {
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) throw HttpError.notFound('User not found')
  if (user.emailVerifiedAt != null) return toPublicUser(user)
  await consumeCode(user.id, 'EMAIL', input.code)
  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { emailVerifiedAt: new Date() },
  })
  return toPublicUser(updated)
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

  // Phone confirmation is mandatory for the account to be usable at all.
  if (user.phoneVerifiedAt == null) {
    throw new HttpError(403, 'Please confirm your mobile number to continue', undefined, 'PHONE_UNVERIFIED')
  }
  // Logging in by email additionally requires the email to be confirmed.
  if (byEmail && user.emailVerifiedAt == null) {
    throw new HttpError(403, 'Please confirm your email to log in with email', undefined, 'EMAIL_UNVERIFIED')
  }

  return { user: toPublicUser(user), token: signAuthToken({ sub: user.id, role: user.role }) }
}

export async function getCurrentUser(userId: string): Promise<PublicUser> {
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) throw HttpError.notFound('User not found')
  return toPublicUser(user)
}

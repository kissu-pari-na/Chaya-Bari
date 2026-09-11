import type { Role, User } from '@prisma/client'
import { prisma } from '../../lib/prisma.js'
import { hashPassword, verifyPassword } from '../../utils/password.js'
import { signAuthToken } from '../../utils/jwt.js'
import { HttpError } from '../../utils/httpError.js'
import type { LoginInput, RegisterInput } from './auth.schemas.js'

export interface PublicUser {
  id: string
  name: string
  email: string
  phone: string | null
  role: Role
}

function toPublicUser(user: User): PublicUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
  }
}

/// Public self-registration always creates a CUSTOMER. Admin/Kitchen accounts
/// are provisioned separately (seed or an admin-only endpoint later) so the
/// role can never be escalated through the registration payload.
export async function register(input: RegisterInput): Promise<{ user: PublicUser; token: string }> {
  const existing = await prisma.user.findUnique({ where: { email: input.email } })
  if (existing) {
    throw HttpError.conflict('An account with this email already exists')
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

  return { user: toPublicUser(user), token: signAuthToken({ sub: user.id, role: user.role }) }
}

export async function login(input: LoginInput): Promise<{ user: PublicUser; token: string }> {
  const user = await prisma.user.findUnique({ where: { email: input.email } })
  if (!user || !user.isActive) {
    throw HttpError.unauthorized('Invalid email or password')
  }

  const ok = await verifyPassword(input.password, user.passwordHash)
  if (!ok) {
    throw HttpError.unauthorized('Invalid email or password')
  }

  return { user: toPublicUser(user), token: signAuthToken({ sub: user.id, role: user.role }) }
}

export async function getCurrentUser(userId: string): Promise<PublicUser> {
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) throw HttpError.notFound('User not found')
  return toPublicUser(user)
}

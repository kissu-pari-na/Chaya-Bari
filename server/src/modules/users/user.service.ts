import { prisma } from '../../lib/prisma.js'
import { hashPassword } from '../../utils/password.js'
import { HttpError } from '../../utils/httpError.js'
import { sendEmailCode } from '../auth/verification.service.js'
import type { CreateUserInput } from './user.schemas.js'

export interface AdminUserRow {
  id: string
  name: string
  email: string
  phone: string | null
  role: 'CUSTOMER' | 'KITCHEN' | 'ADMIN'
  isActive: boolean
  createdAt: string
  /// Footprint: the admin who created this account (null for self-registered
  /// customers and seeded owners).
  createdBy: { id: string; name: string } | null
}

const selectRow = {
  id: true,
  name: true,
  email: true,
  phone: true,
  role: true,
  isActive: true,
  createdAt: true,
  createdBy: { select: { id: true, name: true } },
} as const

type RawRow = {
  id: string
  name: string
  email: string
  phone: string | null
  role: 'CUSTOMER' | 'KITCHEN' | 'ADMIN'
  isActive: boolean
  createdAt: Date
  createdBy: { id: string; name: string } | null
}

function toRow(u: RawRow): AdminUserRow {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    phone: u.phone,
    role: u.role,
    isActive: u.isActive,
    createdAt: u.createdAt.toISOString(),
    createdBy: u.createdBy,
  }
}

export async function listUsers(): Promise<AdminUserRow[]> {
  const rows = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
    select: selectRow,
  })
  return rows.map(toRow)
}

/// Create a user with an explicit role and record which admin created it.
export async function createUser(input: CreateUserInput, createdById: string): Promise<AdminUserRow> {
  // Only a *confirmed* account reserves an email/phone; an unconfirmed account
  // has never proven ownership, so it must not block admin creation either.
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

  // Clear any unconfirmed accounts squatting on this email/phone (cascades
  // remove their pending codes and empty customer profile).
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
      role: input.role,
      createdById,
      // Like self-registration, an admin-created account must confirm its email
      // before it can log in — so a confirmation code is sent below.
      // A CUSTOMER account gets a linked profile, matching self-registration.
      ...(input.role === 'CUSTOMER' ? { customer: { create: {} } } : {}),
    },
    select: selectRow,
  })
  // Send the email confirmation code; the user confirms, then receives a
  // welcome email with their account + login info.
  const full = await prisma.user.findUniqueOrThrow({ where: { id: user.id } })
  await sendEmailCode(full)
  return toRow(user)
}

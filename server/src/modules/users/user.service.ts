import { prisma } from '../../lib/prisma.js'
import { hashPassword } from '../../utils/password.js'
import { HttpError } from '../../utils/httpError.js'
import { sendAdminCreatedEmail } from '../auth/verification.service.js'
import type { CreateUserInput } from './user.schemas.js'
import { releasePhoneFromPlaceholders } from '../customers/customer-account.service.js'

export interface AdminUserRow {
  id: string
  name: string
  email: string
  phone: string | null
  role: 'CUSTOMER' | 'KITCHEN' | 'ADMIN'
  isActive: boolean
  /// Whether the account has confirmed its email. Until then it can't log in.
  emailVerified: boolean
  /// Opened by an admin to order on someone's behalf; not claimed by its owner yet.
  isPlaceholder: boolean
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
  emailVerifiedAt: true,
  isPlaceholder: true,
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
  emailVerifiedAt: Date | null
  isPlaceholder: boolean
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
    emailVerified: u.emailVerifiedAt != null,
    isPlaceholder: u.isPlaceholder,
    createdAt: u.createdAt.toISOString(),
    createdBy: u.createdBy,
  }
}

export async function listUsers(
  page?: { limit: number; offset: number },
): Promise<{ items: AdminUserRow[]; total: number }> {
  const [rows, total] = await Promise.all([
    prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: selectRow,
      ...(page ? { take: page.limit, skip: page.offset } : {}),
    }),
    prisma.user.count(),
  ])
  return { items: rows.map(toRow), total }
}

/// Create a user with an explicit role and record which admin created it.
export async function createUser(input: CreateUserInput, createdById: string): Promise<AdminUserRow> {
  const email = input.email.trim().toLowerCase()
  // Only a *confirmed* account reserves an email/phone; an unconfirmed account
  // has never proven ownership, so it must not block admin creation either.
  const verifiedEmail = await prisma.user.findFirst({
    where: { email, emailVerifiedAt: { not: null } },
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

  // An email that already has orders placed on its behalf keeps its placeholder
  // account (and those orders); it can only become a customer.
  const placeholder = await prisma.user.findFirst({ where: { email, isPlaceholder: true } })
  if (placeholder && input.role !== 'CUSTOMER') {
    throw HttpError.conflict('This email already has orders placed for it, so it can only be a customer account')
  }

  // Clear any unconfirmed accounts squatting on this email/phone (cascades
  // remove their pending codes and empty customer profile). Placeholders are
  // kept and only give up a borrowed phone number.
  await prisma.user.deleteMany({
    where: {
      emailVerifiedAt: null,
      isPlaceholder: false,
      OR: [{ email }, { phone: input.phone }],
    },
  })
  await releasePhoneFromPlaceholders(input.phone, email)

  const passwordHash = await hashPassword(input.password)
  // Like self-registration, an admin-created account must confirm its email
  // before it can log in — so a confirmation code is sent below. Confirming it
  // also takes over a placeholder's orders.
  const user = placeholder
    ? await prisma.user.update({
        where: { id: placeholder.id },
        data: { name: input.name, phone: input.phone, passwordHash },
        select: selectRow,
      })
    : await prisma.user.create({
        data: {
          name: input.name,
          email,
          phone: input.phone,
          passwordHash,
          role: input.role,
          createdById,
          // A CUSTOMER account gets a linked profile, matching self-registration.
          ...(input.role === 'CUSTOMER' ? { customer: { create: {} } } : {}),
        },
        select: selectRow,
      })
  // Email the new user their account details + the confirmation code. The
  // admin-set password is never emailed; once they confirm, the welcome email
  // gives them a link to set their own password.
  const full = await prisma.user.findUniqueOrThrow({ where: { id: user.id } })
  await sendAdminCreatedEmail(full)
  return toRow(user)
}

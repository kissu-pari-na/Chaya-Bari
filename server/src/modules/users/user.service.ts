import { prisma } from '../../lib/prisma.js'
import { hashPassword } from '../../utils/password.js'
import { HttpError } from '../../utils/httpError.js'
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
  const existing = await prisma.user.findUnique({ where: { email: input.email } })
  if (existing) {
    throw HttpError.conflict('An account with this email already exists')
  }
  const existingPhone = await prisma.user.findFirst({ where: { phone: input.phone } })
  if (existingPhone) {
    throw HttpError.conflict('An account with this phone number already exists')
  }

  const passwordHash = await hashPassword(input.password)
  const now = new Date()
  const user = await prisma.user.create({
    data: {
      name: input.name,
      email: input.email,
      phone: input.phone,
      passwordHash,
      role: input.role,
      createdById,
      // Admin-created accounts are trusted, so they are pre-confirmed and can
      // log in immediately by phone or email.
      phoneVerifiedAt: now,
      emailVerifiedAt: now,
      // A CUSTOMER account gets a linked profile, matching self-registration.
      ...(input.role === 'CUSTOMER' ? { customer: { create: {} } } : {}),
    },
    select: selectRow,
  })
  return toRow(user)
}

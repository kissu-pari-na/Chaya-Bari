import { randomBytes } from 'node:crypto'
import type { User } from '@prisma/client'
import { prisma } from '../../lib/prisma.js'
import { hashPassword } from '../../utils/password.js'
import { HttpError } from '../../utils/httpError.js'

// Ordering on behalf of an email.
//
// An admin can place an order for someone who has no account yet, identified
// only by their email. Instead of keeping those orders "loose", the email gets
// a real CUSTOMER account flagged `isPlaceholder`: it has no usable password
// and its email is unconfirmed, so nobody can log into it. Orders, saved
// addresses, notifications and review invites all hang off it exactly like any
// other customer, so there is nothing to merge later.
//
// Whoever proves they own the email (confirms a registration code, signs in
// with Google, or resets the password by email) takes the account over and
// inherits everything. Until then an unconfirmed registration never deletes the
// placeholder — it only borrows it — so a stranger typing someone's email can't
// wipe or steal their order history.

export interface CustomerLookup {
  email: string
  /// No account at all: placing an order will open a placeholder for it.
  exists: boolean
  /// Staff (admin/kitchen) accounts can't be ordered for.
  isStaff: boolean
  /// Opened by an admin and not yet claimed by the email's owner.
  isPlaceholder: boolean
  /// Confirmed account the owner can already log into.
  isRegistered: boolean
  name: string | null
  phone: string | null
  addresses: {
    id: string
    label: string | null
    recipientName: string
    recipientPhone: string
    addressLine: string
    area: string | null
    city: string
    note: string | null
    isDefault: boolean
  }[]
  orderCount: number
}

/// What the admin's "new order" form shows after typing an email: whether the
/// customer already exists and their saved addresses to pick from.
export async function lookupCustomerByEmail(rawEmail: string): Promise<CustomerLookup> {
  const email = rawEmail.trim().toLowerCase()
  const user = await prisma.user.findUnique({
    where: { email },
    include: {
      customer: {
        include: {
          addresses: { orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }] },
          _count: { select: { orders: true } },
        },
      },
    },
  })
  const guestOrders = await prisma.order.count({ where: { customerId: null, guestEmail: email } })
  if (!user) {
    return {
      email,
      exists: false,
      isStaff: false,
      isPlaceholder: false,
      isRegistered: false,
      name: null,
      phone: null,
      addresses: [],
      orderCount: guestOrders,
    }
  }
  return {
    email,
    exists: true,
    isStaff: user.role !== 'CUSTOMER',
    isPlaceholder: user.isPlaceholder,
    isRegistered: !user.isPlaceholder && user.emailVerifiedAt != null,
    name: user.name,
    phone: user.phone,
    addresses: (user.customer?.addresses ?? []).map((a) => ({
      id: a.id,
      label: a.label,
      recipientName: a.recipientName,
      recipientPhone: a.recipientPhone,
      addressLine: a.addressLine,
      area: a.area,
      city: a.city,
      note: a.note,
      isDefault: a.isDefault,
    })),
    orderCount: (user.customer?._count.orders ?? 0) + guestOrders,
  }
}

/// Resolve the customer profile an admin is ordering for, opening a placeholder
/// account when the email has none. Returns the customer id.
export async function findOrCreateCustomerForEmail(
  input: { email: string; name: string },
  adminId: string,
): Promise<{ customerId: string; user: User }> {
  const email = input.email.trim().toLowerCase()
  const existing = await prisma.user.findUnique({ where: { email }, include: { customer: true } })

  if (existing) {
    if (existing.role !== 'CUSTOMER') {
      throw HttpError.conflict('This email belongs to a staff account and cannot be ordered for')
    }
    // An unconfirmed self-registration that is still in progress: nobody has
    // proven the email yet, so turn it into a placeholder. That keeps the
    // registration cleanup from ever deleting it now that it will own orders;
    // if the registrant really owns the email, confirming it claims everything.
    const user =
      existing.emailVerifiedAt == null && !existing.isPlaceholder
        ? await prisma.user.update({ where: { id: existing.id }, data: { isPlaceholder: true } })
        : existing
    const customerId =
      existing.customer?.id ?? (await prisma.customer.create({ data: { userId: existing.id } })).id
    await claimGuestOrders(user.id)
    return { customerId, user }
  }

  // No account yet: open a placeholder. The password is random and never
  // shared, so the account can't be logged into until the owner claims it.
  // Phone is deliberately left empty — it's unique across accounts and the
  // owner supplies it when they register; the order/address snapshots keep the
  // number the admin entered.
  const user = await prisma.user.create({
    data: {
      email,
      name: input.name,
      passwordHash: await hashPassword(randomBytes(32).toString('hex')),
      role: 'CUSTOMER',
      isPlaceholder: true,
      createdById: adminId,
      customer: { create: {} },
    },
    include: { customer: true },
  })
  await claimGuestOrders(user.id)
  return { customerId: user.customer!.id, user }
}

/// Attach loose guest-checkout orders placed with this user's email to their
/// customer profile, so everything ordered under the email shows up in one
/// history. Safe to call repeatedly.
export async function claimGuestOrders(userId: string): Promise<number> {
  const user = await prisma.user.findUnique({ where: { id: userId }, include: { customer: true } })
  if (!user || user.role !== 'CUSTOMER') return 0
  const customerId = user.customer?.id ?? (await prisma.customer.create({ data: { userId } })).id
  const res = await prisma.order.updateMany({
    where: { customerId: null, guestEmail: user.email.toLowerCase() },
    data: { customerId },
  })
  return res.count
}

/// The owner has just proven they own this account's email (confirmation code,
/// Google, or a password-reset code). Mark it confirmed, end its placeholder
/// status, and pull in any guest orders placed with the email.
export async function activateAccount(userId: string): Promise<User> {
  const current = await prisma.user.findUniqueOrThrow({ where: { id: userId } })
  const user =
    current.emailVerifiedAt == null || current.isPlaceholder
      ? await prisma.user.update({
          where: { id: userId },
          data: { emailVerifiedAt: current.emailVerifiedAt ?? new Date(), isPlaceholder: false },
        })
      : current
  await claimGuestOrders(user.id)
  return user
}

/// A phone number is unique across accounts. Placeholders only ever borrow one
/// (from an unconfirmed registration), so they give it up to whoever claims it.
export async function releasePhoneFromPlaceholders(phone: string, exceptEmail: string): Promise<void> {
  await prisma.user.updateMany({
    where: { isPlaceholder: true, phone, NOT: { email: exceptEmail } },
    data: { phone: null },
  })
}

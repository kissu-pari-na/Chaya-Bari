import { prisma } from '../../lib/prisma.js'
import { HttpError } from '../../utils/httpError.js'
import type { AddressInput, UpdateAddressInput } from './order.schemas.js'

/// Orbitax staff (company email) get their office delivery address pre-filled as
/// the default the moment their account is created, so checkout is one click.
const ORBITAX_OFFICE_ADDRESS = {
  label: 'Office',
  addressLine: 'Orbitax Bd Ltd, 9th floor, Raowa Club, Mohakhali',
  area: 'Mohakhali Dohs',
  city: 'Dhaka',
} as const

/// True for a company email under the orbitax.com domain (matches the exact
/// domain and any subdomain, e.g. foo@orbitax.com or foo@bd.orbitax.com).
export function isOrbitaxEmail(email: string): boolean {
  const domain = email.trim().toLowerCase().split('@')[1] ?? ''
  return domain === 'orbitax.com' || domain.endsWith('.orbitax.com')
}

/// Create the Orbitax office address as the default for a customer whose email is
/// on the orbitax.com domain. No-op for other domains and idempotent: it only
/// runs when the customer has no addresses yet, so re-running signup flows or the
/// backfill script never creates duplicates.
export async function ensureOrbitaxDefaultAddress(
  customerId: string,
  user: { name: string; phone: string | null; email: string },
): Promise<void> {
  if (!isOrbitaxEmail(user.email)) return
  const existing = await prisma.address.count({ where: { customerId } })
  if (existing > 0) return
  await prisma.address.create({
    data: {
      customerId,
      label: ORBITAX_OFFICE_ADDRESS.label,
      recipientName: user.name,
      recipientPhone: user.phone ?? '',
      addressLine: ORBITAX_OFFICE_ADDRESS.addressLine,
      area: ORBITAX_OFFICE_ADDRESS.area,
      city: ORBITAX_OFFICE_ADDRESS.city,
      isDefault: true,
    },
  })
}

export async function listAddresses(customerId: string) {
  return prisma.address.findMany({
    where: { customerId },
    orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
  })
}

async function getOwnedAddress(customerId: string, id: string) {
  const address = await prisma.address.findUnique({ where: { id } })
  if (!address || address.customerId !== customerId) {
    throw HttpError.notFound('Address not found')
  }
  return address
}

export async function createAddress(customerId: string, input: AddressInput) {
  return prisma.$transaction(async (tx) => {
    if (input.isDefault) {
      await tx.address.updateMany({ where: { customerId }, data: { isDefault: false } })
    }
    // Phone is optional on an address (backfilled at checkout); the column is
    // non-null, so store an empty string when it wasn't provided.
    return tx.address.create({ data: { ...input, recipientPhone: input.recipientPhone ?? '', customerId } })
  })
}

export async function updateAddress(customerId: string, id: string, input: UpdateAddressInput) {
  await getOwnedAddress(customerId, id)
  return prisma.$transaction(async (tx) => {
    if (input.isDefault) {
      await tx.address.updateMany({ where: { customerId }, data: { isDefault: false } })
    }
    return tx.address.update({ where: { id }, data: input })
  })
}

export async function deleteAddress(customerId: string, id: string) {
  await getOwnedAddress(customerId, id)
  await prisma.address.delete({ where: { id } })
}

import { prisma } from '../../lib/prisma.js'
import { HttpError } from '../../utils/httpError.js'
import type { AddressInput, UpdateAddressInput } from './order.schemas.js'

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
    return tx.address.create({ data: { ...input, customerId } })
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

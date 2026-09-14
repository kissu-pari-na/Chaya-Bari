import { prisma } from '../../lib/prisma.js'
import { HttpError } from '../../utils/httpError.js'

/// Resolves the Customer row for an authenticated user, or 403 if the user has
/// no customer profile (e.g. an admin/kitchen account trying to order).
export async function requireCustomerId(userId: string): Promise<string> {
  const customer = await prisma.customer.findUnique({ where: { userId } })
  if (!customer) {
    throw HttpError.forbidden('Only customer accounts can perform this action')
  }
  return customer.id
}

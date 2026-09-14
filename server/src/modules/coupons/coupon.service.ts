import { Prisma, type Coupon } from '@prisma/client'
import { prisma } from '../../lib/prisma.js'
import { HttpError } from '../../utils/httpError.js'
import type { CreateCouponInput } from './coupon.schemas.js'

export interface PublicCoupon {
  id: string
  code: string
  description: string | null
  scope: Coupon['scope']
  kind: Coupon['kind']
  value: number
  minOrderSubtotal: number
  isActive: boolean
  expiresAt: string | null
}

export function toPublicCoupon(c: Coupon): PublicCoupon {
  return {
    id: c.id,
    code: c.code,
    description: c.description,
    scope: c.scope,
    kind: c.kind,
    value: Number(c.value),
    minOrderSubtotal: Number(c.minOrderSubtotal),
    isActive: c.isActive,
    expiresAt: c.expiresAt ? c.expiresAt.toISOString() : null,
  }
}

function toData(input: CreateCouponInput) {
  return {
    code: input.code,
    description: input.description,
    scope: input.scope,
    kind: input.kind,
    value: new Prisma.Decimal(input.value ?? 0),
    minOrderSubtotal: new Prisma.Decimal(input.minOrderSubtotal ?? 0),
    isActive: input.isActive ?? true,
    expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
  }
}

export async function listCoupons() {
  const coupons = await prisma.coupon.findMany({ orderBy: { createdAt: 'desc' } })
  return coupons.map(toPublicCoupon)
}

export async function createCoupon(input: CreateCouponInput) {
  return toPublicCoupon(await prisma.coupon.create({ data: toData(input) }))
}

export async function updateCoupon(id: string, input: CreateCouponInput) {
  const existing = await prisma.coupon.findUnique({ where: { id } })
  if (!existing) throw HttpError.notFound('Coupon not found')
  return toPublicCoupon(await prisma.coupon.update({ where: { id }, data: toData(input) }))
}

export async function deleteCoupon(id: string) {
  const existing = await prisma.coupon.findUnique({ where: { id } })
  if (!existing) throw HttpError.notFound('Coupon not found')
  await prisma.coupon.delete({ where: { id } })
}

/// Looks up an active coupon by code for use at checkout / preview.
export async function findUsableCoupon(code: string): Promise<Coupon> {
  const coupon = await prisma.coupon.findUnique({ where: { code: code.toUpperCase() } })
  if (!coupon) throw HttpError.badRequest('Invalid coupon code')
  return coupon
}

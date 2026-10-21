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
  limitDays: number | null
  maxRedemptions: number | null
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
    limitDays: c.limitDays,
    maxRedemptions: c.maxRedemptions,
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
    limitDays: input.scope === 'WALLET_LIMIT' ? (input.limitDays ?? null) : null,
    maxRedemptions: input.scope === 'WALLET_LIMIT' ? (input.maxRedemptions ?? null) : null,
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

/// Looks up an active coupon by code for use at checkout / preview. Wallet-limit
/// codes are redeemed in the wallet, never applied to an order.
export async function findUsableCoupon(code: string): Promise<Coupon> {
  const coupon = await prisma.coupon.findUnique({ where: { code: code.toUpperCase() } })
  if (!coupon) throw HttpError.badRequest('Invalid coupon code')
  if (coupon.scope === 'WALLET_LIMIT') {
    throw HttpError.badRequest('This is a pay-later limit code. Redeem it in your wallet instead.')
  }
  return coupon
}

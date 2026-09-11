import type { Request, Response } from 'express'
import { prisma } from '../../lib/prisma.js'
import * as couponService from './coupon.service.js'
import { getOrderingSetting } from '../orders/ordering.service.js'
import { priceOrder } from '../orders/pricing.js'
import type { ApplyCouponInput } from './coupon.schemas.js'

// ---- Admin CRUD ----

export async function list(_req: Request, res: Response) {
  res.json({ coupons: await couponService.listCoupons() })
}

export async function create(req: Request, res: Response) {
  res.status(201).json({ coupon: await couponService.createCoupon(req.body) })
}

export async function update(req: Request, res: Response) {
  res.json({ coupon: await couponService.updateCoupon(req.params.id, req.body) })
}

export async function remove(req: Request, res: Response) {
  await couponService.deleteCoupon(req.params.id)
  res.status(204).send()
}

// ---- Customer preview: compute the discounted totals for a cart + code ----

export async function preview(req: Request, res: Response) {
  const { code, items } = req.body as ApplyCouponInput
  const coupon = await couponService.findUsableCoupon(code)
  const setting = await getOrderingSetting()

  const products = await prisma.product.findMany({ where: { id: { in: items.map((i) => i.productId) } } })
  const priced = priceOrder({
    items,
    products: new Map(products.map((p) => [p.id, p])),
    deliveryCost: setting.defaultDeliveryCost,
    coupon,
  })

  res.json({
    coupon: couponService.toPublicCoupon(coupon),
    pricing: {
      subtotal: Number(priced.subtotal),
      productDiscount: Number(priced.productDiscount),
      netFood: Number(priced.netFood),
      customerDeliveryCost: Number(priced.customerDeliveryCost),
      deliveryDiscount: Number(priced.deliveryDiscount),
      total: Number(priced.total),
    },
  })
}

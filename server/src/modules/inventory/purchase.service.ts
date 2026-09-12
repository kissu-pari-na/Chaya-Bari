import { Prisma } from '@prisma/client'
import { prisma } from '../../lib/prisma.js'
import { HttpError } from '../../utils/httpError.js'
import type { CreatePurchaseInput } from './inventory.schemas.js'

export interface PublicPurchaseItem {
  id: string
  materialId: string
  materialName: string
  unit: string
  quantity: number
  totalCost: number
  unitCost: number
}

export interface PublicPurchase {
  id: string
  purchasedAt: string
  supplier: string | null
  note: string | null
  totalCost: number
  items: PublicPurchaseItem[]
}

/// Records a purchase and, for each line, updates the material's stock and
/// weighted-average unit cost, logging an inventory transaction. Weighted
/// average: newAvg = (oldStock*oldAvg + lineCost) / (oldStock + qty).
export async function createPurchase(input: CreatePurchaseInput): Promise<PublicPurchase> {
  const materialIds = input.items.map((i) => i.materialId)
  const materials = await prisma.material.findMany({ where: { id: { in: materialIds } } })
  const byId = new Map(materials.map((m) => [m.id, m]))
  for (const item of input.items) {
    if (!byId.has(item.materialId)) throw HttpError.badRequest(`Material not found: ${item.materialId}`)
  }

  const totalCost = input.items.reduce((sum, i) => sum.add(new Prisma.Decimal(i.totalCost)), new Prisma.Decimal(0))

  return prisma.$transaction(async (tx) => {
    const purchase = await tx.purchase.create({
      data: {
        supplier: input.supplier,
        note: input.note,
        purchasedAt: input.purchasedAt ? new Date(input.purchasedAt) : undefined,
        totalCost,
        items: {
          create: input.items.map((i) => ({
            materialId: i.materialId,
            quantity: new Prisma.Decimal(i.quantity),
            totalCost: new Prisma.Decimal(i.totalCost),
          })),
        },
      },
      include: { items: { include: { material: true } } },
    })

    for (const item of input.items) {
      const material = byId.get(item.materialId)!
      const qty = new Prisma.Decimal(item.quantity)
      const lineCost = new Prisma.Decimal(item.totalCost)
      const newStock = material.stockQty.add(qty)
      const newAvg = newStock.gt(0)
        ? material.stockQty.mul(material.avgUnitCost).add(lineCost).div(newStock)
        : new Prisma.Decimal(0)

      await tx.material.update({ where: { id: material.id }, data: { stockQty: newStock, avgUnitCost: newAvg } })
      await tx.inventoryTransaction.create({
        data: {
          materialId: material.id,
          type: 'PURCHASE',
          quantityDelta: qty,
          unitCost: qty.gt(0) ? lineCost.div(qty) : new Prisma.Decimal(0),
        },
      })
    }

    return toPublicPurchase(purchase)
  })
}

type PurchaseRow = Prisma.PurchaseGetPayload<{ include: { items: { include: { material: true } } } }>

function toPublicPurchase(p: PurchaseRow): PublicPurchase {
  return {
    id: p.id,
    purchasedAt: p.purchasedAt.toISOString(),
    supplier: p.supplier,
    note: p.note,
    totalCost: Number(p.totalCost),
    items: p.items.map((i) => ({
      id: i.id,
      materialId: i.materialId,
      materialName: i.material.name,
      unit: i.material.unit,
      quantity: Number(i.quantity),
      totalCost: Number(i.totalCost),
      unitCost: Number(i.quantity) > 0 ? Number(i.totalCost) / Number(i.quantity) : 0,
    })),
  }
}

export async function listPurchases(): Promise<PublicPurchase[]> {
  const purchases = await prisma.purchase.findMany({
    include: { items: { include: { material: true } } },
    orderBy: { purchasedAt: 'desc' },
  })
  return purchases.map(toPublicPurchase)
}

import { Prisma, type Material } from '@prisma/client'
import { prisma } from '../../lib/prisma.js'
import { HttpError } from '../../utils/httpError.js'
import type { AdjustStockInput, CreateMaterialInput, UpdateMaterialInput } from './inventory.schemas.js'

export interface PublicMaterial {
  id: string
  name: string
  kind: Material['kind']
  unit: string
  stockQty: number
  avgUnitCost: number
}

export function toPublicMaterial(m: Material): PublicMaterial {
  return {
    id: m.id,
    name: m.name,
    kind: m.kind,
    unit: m.unit,
    stockQty: Number(m.stockQty),
    avgUnitCost: Number(m.avgUnitCost),
  }
}

export async function listMaterials(kind?: string): Promise<PublicMaterial[]> {
  const materials = await prisma.material.findMany({
    where: kind === 'INGREDIENT' || kind === 'PACKAGING' ? { kind } : undefined,
    orderBy: [{ kind: 'asc' }, { name: 'asc' }],
  })
  return materials.map(toPublicMaterial)
}

export async function createMaterial(input: CreateMaterialInput): Promise<PublicMaterial> {
  return toPublicMaterial(await prisma.material.create({ data: input }))
}

export async function updateMaterial(id: string, input: UpdateMaterialInput): Promise<PublicMaterial> {
  const existing = await prisma.material.findUnique({ where: { id } })
  if (!existing) throw HttpError.notFound('Material not found')
  return toPublicMaterial(await prisma.material.update({ where: { id }, data: input }))
}

export async function deleteMaterial(id: string): Promise<void> {
  const refs = await prisma.recipeItem.count({ where: { materialId: id } })
  if (refs > 0) throw HttpError.conflict('This material is used in a recipe and cannot be deleted')
  const purchaseRefs = await prisma.purchaseItem.count({ where: { materialId: id } })
  if (purchaseRefs > 0) throw HttpError.conflict('This material has purchase history and cannot be deleted')
  await prisma.material.delete({ where: { id } })
}

/// Manual stock adjustment (correction, spoilage). Does not change the average
/// cost; it only moves quantity and logs an inventory transaction.
export async function adjustStock(id: string, input: AdjustStockInput): Promise<PublicMaterial> {
  const material = await prisma.material.findUnique({ where: { id } })
  if (!material) throw HttpError.notFound('Material not found')

  const delta = new Prisma.Decimal(input.quantityDelta)
  const newStock = material.stockQty.add(delta)
  if (newStock.lt(0)) throw HttpError.badRequest('Adjustment would make stock negative')

  const [updated] = await prisma.$transaction([
    prisma.material.update({ where: { id }, data: { stockQty: newStock } }),
    prisma.inventoryTransaction.create({
      data: { materialId: id, type: 'ADJUSTMENT', quantityDelta: delta, unitCost: material.avgUnitCost, note: input.note },
    }),
  ])
  return toPublicMaterial(updated)
}

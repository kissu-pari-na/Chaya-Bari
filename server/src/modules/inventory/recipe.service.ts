import { Prisma } from '@prisma/client'
import { prisma } from '../../lib/prisma.js'
import { HttpError } from '../../utils/httpError.js'
import type { UpsertRecipeInput } from './inventory.schemas.js'

export interface PublicRecipeItem {
  id: string
  materialId: string
  materialName: string
  kind: 'INGREDIENT' | 'PACKAGING'
  unit: string
  quantity: number
  avgUnitCost: number
  lineCost: number
}

export interface RecipeCosting {
  batchCost: number
  ingredientCost: number
  packagingCost: number
  yieldQty: number
  costPerUnit: number
  sellingPrice: number
  grossProfitPerUnit: number
  marginPct: number | null
}

export interface PublicRecipe {
  id: string
  productId: string
  productName: string
  yieldQty: number
  note: string | null
  items: PublicRecipeItem[]
  costing: RecipeCosting
}

type RecipeRow = Prisma.RecipeGetPayload<{
  include: { items: { include: { material: true } }; product: true }
}>

function toPublicRecipe(recipe: RecipeRow): PublicRecipe {
  let ingredientCost = new Prisma.Decimal(0)
  let packagingCost = new Prisma.Decimal(0)

  const items: PublicRecipeItem[] = recipe.items.map((i) => {
    const lineCost = i.quantity.mul(i.material.avgUnitCost)
    if (i.material.kind === 'PACKAGING') packagingCost = packagingCost.add(lineCost)
    else ingredientCost = ingredientCost.add(lineCost)
    return {
      id: i.id,
      materialId: i.materialId,
      materialName: i.material.name,
      kind: i.material.kind,
      unit: i.material.unit,
      quantity: Number(i.quantity),
      avgUnitCost: Number(i.material.avgUnitCost),
      lineCost: Number(lineCost),
    }
  })

  const batchCost = ingredientCost.add(packagingCost)
  const yieldQty = recipe.yieldQty
  const costPerUnit = yieldQty > 0 ? batchCost.div(yieldQty) : new Prisma.Decimal(0)
  const sellingPrice = recipe.product.price
  const grossProfit = sellingPrice.sub(costPerUnit)
  const marginPct = sellingPrice.gt(0) ? Number(grossProfit.div(sellingPrice).mul(100)) : null

  return {
    id: recipe.id,
    productId: recipe.productId,
    productName: recipe.product.name,
    yieldQty,
    note: recipe.note,
    items,
    costing: {
      batchCost: Number(batchCost),
      ingredientCost: Number(ingredientCost),
      packagingCost: Number(packagingCost),
      yieldQty,
      costPerUnit: Number(costPerUnit),
      sellingPrice: Number(sellingPrice),
      grossProfitPerUnit: Number(grossProfit),
      marginPct,
    },
  }
}

export async function getRecipe(productId: string): Promise<PublicRecipe | null> {
  const recipe = await prisma.recipe.findUnique({
    where: { productId },
    include: { items: { include: { material: true } }, product: true },
  })
  return recipe ? toPublicRecipe(recipe) : null
}

export async function upsertRecipe(productId: string, input: UpsertRecipeInput): Promise<PublicRecipe> {
  const product = await prisma.product.findUnique({ where: { id: productId } })
  if (!product) throw HttpError.notFound('Product not found')

  const materialIds = input.items.map((i) => i.materialId)
  const found = await prisma.material.count({ where: { id: { in: materialIds } } })
  if (found !== new Set(materialIds).size) throw HttpError.badRequest('One or more materials were not found')

  await prisma.$transaction(async (tx) => {
    const existing = await tx.recipe.findUnique({ where: { productId } })
    if (existing) {
      await tx.recipeItem.deleteMany({ where: { recipeId: existing.id } })
      await tx.recipe.update({
        where: { productId },
        data: {
          yieldQty: input.yieldQty,
          note: input.note,
          items: { create: input.items.map((i) => ({ materialId: i.materialId, quantity: new Prisma.Decimal(i.quantity) })) },
        },
      })
    } else {
      await tx.recipe.create({
        data: {
          productId,
          yieldQty: input.yieldQty,
          note: input.note,
          items: { create: input.items.map((i) => ({ materialId: i.materialId, quantity: new Prisma.Decimal(i.quantity) })) },
        },
      })
    }
  })

  return (await getRecipe(productId))!
}

export async function deleteRecipe(productId: string): Promise<void> {
  const existing = await prisma.recipe.findUnique({ where: { productId } })
  if (!existing) throw HttpError.notFound('Recipe not found')
  await prisma.recipe.delete({ where: { productId } })
}

export interface CostingRow {
  productId: string
  productName: string
  sellingPrice: number
  hasRecipe: boolean
  costPerUnit: number | null
  grossProfitPerUnit: number | null
  marginPct: number | null
}

/// Costing overview across all products (recipe cost vs. selling price).
export async function listCosting(): Promise<CostingRow[]> {
  const products = await prisma.product.findMany({
    include: { recipe: { include: { items: { include: { material: true } }, product: true } } },
    orderBy: { name: 'asc' },
  })

  return products.map((p) => {
    if (!p.recipe) {
      return {
        productId: p.id,
        productName: p.name,
        sellingPrice: Number(p.price),
        hasRecipe: false,
        costPerUnit: null,
        grossProfitPerUnit: null,
        marginPct: null,
      }
    }
    const pub = toPublicRecipe(p.recipe)
    return {
      productId: p.id,
      productName: p.name,
      sellingPrice: pub.costing.sellingPrice,
      hasRecipe: true,
      costPerUnit: pub.costing.costPerUnit,
      grossProfitPerUnit: pub.costing.grossProfitPerUnit,
      marginPct: pub.costing.marginPct,
    }
  })
}

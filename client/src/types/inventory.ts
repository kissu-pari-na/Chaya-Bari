export type MaterialKind = 'INGREDIENT' | 'PACKAGING'

export interface Material {
  id: string
  name: string
  kind: MaterialKind
  unit: string
  stockQty: number
  avgUnitCost: number
}

export interface MaterialInput {
  name: string
  kind: MaterialKind
  unit: string
}

export interface PurchaseItem {
  id: string
  materialId: string
  materialName: string
  unit: string
  quantity: number
  totalCost: number
  unitCost: number
}

export interface Purchase {
  id: string
  purchasedAt: string
  supplier: string | null
  note: string | null
  totalCost: number
  items: PurchaseItem[]
}

export interface PurchaseInput {
  supplier?: string
  note?: string
  items: { materialId: string; quantity: number; totalCost: number }[]
}

export interface RecipeItem {
  id: string
  materialId: string
  materialName: string
  kind: MaterialKind
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

export interface Recipe {
  id: string
  productId: string
  productName: string
  yieldQty: number
  note: string | null
  items: RecipeItem[]
  costing: RecipeCosting
}

export interface RecipeInput {
  yieldQty: number
  note?: string
  items: { materialId: string; quantity: number }[]
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

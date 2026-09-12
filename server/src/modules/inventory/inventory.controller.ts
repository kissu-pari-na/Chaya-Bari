import type { Request, Response } from 'express'
import * as materialService from './material.service.js'
import * as purchaseService from './purchase.service.js'
import * as recipeService from './recipe.service.js'

// ---- Materials ----

export async function listMaterials(req: Request, res: Response) {
  const kind = typeof req.query.kind === 'string' ? req.query.kind : undefined
  res.json({ materials: await materialService.listMaterials(kind) })
}

export async function createMaterial(req: Request, res: Response) {
  res.status(201).json({ material: await materialService.createMaterial(req.body) })
}

export async function updateMaterial(req: Request, res: Response) {
  res.json({ material: await materialService.updateMaterial(req.params.id, req.body) })
}

export async function deleteMaterial(req: Request, res: Response) {
  await materialService.deleteMaterial(req.params.id)
  res.status(204).send()
}

export async function adjustStock(req: Request, res: Response) {
  res.json({ material: await materialService.adjustStock(req.params.id, req.body) })
}

// ---- Purchases ----

export async function listPurchases(_req: Request, res: Response) {
  res.json({ purchases: await purchaseService.listPurchases() })
}

export async function createPurchase(req: Request, res: Response) {
  res.status(201).json({ purchase: await purchaseService.createPurchase(req.body) })
}

// ---- Recipes / costing ----

export async function getRecipe(req: Request, res: Response) {
  res.json({ recipe: await recipeService.getRecipe(req.params.id) })
}

export async function upsertRecipe(req: Request, res: Response) {
  res.json({ recipe: await recipeService.upsertRecipe(req.params.id, req.body) })
}

export async function deleteRecipe(req: Request, res: Response) {
  await recipeService.deleteRecipe(req.params.id)
  res.status(204).send()
}

export async function listCosting(_req: Request, res: Response) {
  res.json({ costing: await recipeService.listCosting() })
}

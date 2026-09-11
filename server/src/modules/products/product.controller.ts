import type { Request, Response } from 'express'
import * as productService from './product.service.js'

// ---- Public (customer browsing) ----

export async function listPublicProducts(req: Request, res: Response) {
  const categoryId = typeof req.query.categoryId === 'string' ? req.query.categoryId : undefined
  const products = await productService.listProducts({ categoryId, includeHidden: false })
  res.json({ products })
}

export async function getPublicProduct(req: Request, res: Response) {
  const product = await productService.getProduct(req.params.id, false)
  res.json({ product })
}

export async function listPublicCategories(_req: Request, res: Response) {
  const categories = await productService.listCategories(true)
  res.json({ categories })
}

// ---- Admin ----

export async function listAdminProducts(req: Request, res: Response) {
  const categoryId = typeof req.query.categoryId === 'string' ? req.query.categoryId : undefined
  const products = await productService.listProducts({ categoryId, includeHidden: true })
  res.json({ products })
}

export async function getAdminProduct(req: Request, res: Response) {
  const product = await productService.getProduct(req.params.id, true)
  res.json({ product })
}

export async function createProduct(req: Request, res: Response) {
  const product = await productService.createProduct(req.body)
  res.status(201).json({ product })
}

export async function updateProduct(req: Request, res: Response) {
  const product = await productService.updateProduct(req.params.id, req.body)
  res.json({ product })
}

export async function deleteProduct(req: Request, res: Response) {
  await productService.deleteProduct(req.params.id)
  res.status(204).send()
}

export async function listAdminCategories(_req: Request, res: Response) {
  const categories = await productService.listCategories(false)
  res.json({ categories })
}

export async function createCategory(req: Request, res: Response) {
  const category = await productService.createCategory(req.body)
  res.status(201).json({ category })
}

export async function updateCategory(req: Request, res: Response) {
  const category = await productService.updateCategory(req.params.id, req.body)
  res.json({ category })
}

export async function deleteCategory(req: Request, res: Response) {
  await productService.deleteCategory(req.params.id)
  res.status(204).send()
}

import type { Request, Response } from 'express'
import * as expenseService from './expense.service.js'

function str(v: unknown): string | undefined {
  return typeof v === 'string' && v.length > 0 ? v : undefined
}

export async function listCategories(_req: Request, res: Response) {
  res.json({ categories: await expenseService.listCategories() })
}

export async function createCategory(req: Request, res: Response) {
  res.status(201).json({ category: await expenseService.createCategory(req.body) })
}

export async function deleteCategory(req: Request, res: Response) {
  await expenseService.deleteCategory(req.params.id)
  res.status(204).send()
}

export async function listExpenses(req: Request, res: Response) {
  const expenses = await expenseService.listExpenses({
    from: str(req.query.from),
    to: str(req.query.to),
    categoryId: str(req.query.categoryId),
  })
  res.json({ expenses })
}

export async function createExpense(req: Request, res: Response) {
  res.status(201).json({ expense: await expenseService.createExpense(req.body) })
}

export async function deleteExpense(req: Request, res: Response) {
  await expenseService.deleteExpense(req.params.id)
  res.status(204).send()
}

export async function summary(req: Request, res: Response) {
  res.json({ summary: await expenseService.expenseSummary(str(req.query.from), str(req.query.to)) })
}

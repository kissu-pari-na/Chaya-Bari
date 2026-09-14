import { Prisma } from '@prisma/client'
import { prisma } from '../../lib/prisma.js'
import { HttpError } from '../../utils/httpError.js'
import type { CreateExpenseCategoryInput, CreateExpenseInput } from './expense.schemas.js'

export interface PublicExpense {
  id: string
  categoryId: string
  categoryName: string
  amount: number
  spentAt: string
  description: string
  note: string | null
}

function toUtcDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d))
}

// ---- Categories ----

export async function listCategories() {
  return prisma.expenseCategory.findMany({ orderBy: { name: 'asc' } })
}

export async function createCategory(input: CreateExpenseCategoryInput) {
  return prisma.expenseCategory.create({ data: input })
}

export async function deleteCategory(id: string) {
  const count = await prisma.expense.count({ where: { categoryId: id } })
  if (count > 0) throw HttpError.conflict('This category has expenses and cannot be deleted')
  await prisma.expenseCategory.delete({ where: { id } })
}

// ---- Expenses ----

interface ExpenseFilters {
  from?: string
  to?: string
  categoryId?: string
}

function dateRangeWhere(from?: string, to?: string): Prisma.ExpenseWhereInput {
  const where: Prisma.ExpenseWhereInput = {}
  if (from || to) {
    where.spentAt = {}
    if (from) where.spentAt.gte = toUtcDate(from)
    if (to) where.spentAt.lte = toUtcDate(to)
  }
  return where
}

export async function listExpenses(filters: ExpenseFilters): Promise<PublicExpense[]> {
  const where = dateRangeWhere(filters.from, filters.to)
  if (filters.categoryId) where.categoryId = filters.categoryId

  const expenses = await prisma.expense.findMany({
    where,
    include: { category: true },
    orderBy: { spentAt: 'desc' },
  })
  return expenses.map((e) => ({
    id: e.id,
    categoryId: e.categoryId,
    categoryName: e.category.name,
    amount: Number(e.amount),
    spentAt: e.spentAt.toISOString().slice(0, 10),
    description: e.description,
    note: e.note,
  }))
}

export async function createExpense(input: CreateExpenseInput): Promise<PublicExpense> {
  const category = await prisma.expenseCategory.findUnique({ where: { id: input.categoryId } })
  if (!category) throw HttpError.badRequest('Expense category not found')

  const expense = await prisma.expense.create({
    data: {
      categoryId: input.categoryId,
      amount: new Prisma.Decimal(input.amount),
      spentAt: toUtcDate(input.spentAt),
      description: input.description,
      note: input.note,
    },
    include: { category: true },
  })
  return {
    id: expense.id,
    categoryId: expense.categoryId,
    categoryName: expense.category.name,
    amount: Number(expense.amount),
    spentAt: expense.spentAt.toISOString().slice(0, 10),
    description: expense.description,
    note: expense.note,
  }
}

export async function deleteExpense(id: string) {
  const existing = await prisma.expense.findUnique({ where: { id } })
  if (!existing) throw HttpError.notFound('Expense not found')
  await prisma.expense.delete({ where: { id } })
}

export interface ExpenseSummary {
  total: number
  byCategory: { categoryId: string; categoryName: string; total: number }[]
}

export async function expenseSummary(from?: string, to?: string): Promise<ExpenseSummary> {
  const expenses = await prisma.expense.findMany({ where: dateRangeWhere(from, to), include: { category: true } })
  const byCat = new Map<string, { categoryName: string; total: number }>()
  let total = 0
  for (const e of expenses) {
    const amt = Number(e.amount)
    total += amt
    const entry = byCat.get(e.categoryId) ?? { categoryName: e.category.name, total: 0 }
    entry.total += amt
    byCat.set(e.categoryId, entry)
  }
  return {
    total,
    byCategory: [...byCat.entries()]
      .map(([categoryId, v]) => ({ categoryId, categoryName: v.categoryName, total: v.total }))
      .sort((a, b) => b.total - a.total),
  }
}

/// Total general expenses in a period (used by the profit dashboard).
export async function totalExpenses(from: string, to: string): Promise<number> {
  const agg = await prisma.expense.aggregate({
    where: dateRangeWhere(from, to),
    _sum: { amount: true },
  })
  return Number(agg._sum.amount ?? 0)
}

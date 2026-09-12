import { apiRequest } from './apiClient'
import type {
  BusinessSummary,
  Expense,
  ExpenseCategory,
  ExpenseInput,
  ExpenseSummary,
  OrderContribution,
  ProductProfitRow,
} from '../types/reports'

// ---- Expenses ----

export function fetchExpenseCategories() {
  return apiRequest<{ categories: ExpenseCategory[] }>('/admin/expense-categories', { auth: true }).then(
    (r) => r.categories,
  )
}

export function createExpenseCategory(name: string) {
  return apiRequest<{ category: ExpenseCategory }>('/admin/expense-categories', {
    method: 'POST',
    body: { name },
    auth: true,
  }).then((r) => r.category)
}

export function fetchExpenses(params: { from?: string; to?: string; categoryId?: string } = {}) {
  const q = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) if (v) q.set(k, v)
  const query = q.toString() ? `?${q.toString()}` : ''
  return apiRequest<{ expenses: Expense[] }>(`/admin/expenses${query}`, { auth: true }).then((r) => r.expenses)
}

export function createExpense(input: ExpenseInput) {
  return apiRequest<{ expense: Expense }>('/admin/expenses', { method: 'POST', body: input, auth: true }).then(
    (r) => r.expense,
  )
}

export function deleteExpense(id: string) {
  return apiRequest<void>(`/admin/expenses/${id}`, { method: 'DELETE', auth: true })
}

export function fetchExpenseSummary(from: string, to: string) {
  return apiRequest<{ summary: ExpenseSummary }>(`/admin/expenses/summary?from=${from}&to=${to}`, {
    auth: true,
  }).then((r) => r.summary)
}

// ---- Analytics ----

export function fetchBusinessSummary(from: string, to: string) {
  return apiRequest<{ summary: BusinessSummary }>(`/admin/reports/summary?from=${from}&to=${to}`, {
    auth: true,
  }).then((r) => r.summary)
}

export function fetchProductProfitability(from: string, to: string) {
  return apiRequest<{ products: ProductProfitRow[] }>(`/admin/reports/products?from=${from}&to=${to}`, {
    auth: true,
  }).then((r) => r.products)
}

export function fetchOrderContribution(orderId: string) {
  return apiRequest<{ contribution: OrderContribution }>(`/admin/orders/${orderId}/contribution`, {
    auth: true,
  }).then((r) => r.contribution)
}

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

// ---- Phase 10 analytics ----

import type { CustomerAnalyticsRow, DemandProfitRow, SalesByDayRow } from '../types/reports'

export function fetchCustomerAnalytics(from: string, to: string) {
  return apiRequest<{ customers: CustomerAnalyticsRow[] }>(`/admin/reports/customers?from=${from}&to=${to}`, {
    auth: true,
  }).then((r) => r.customers)
}

export function fetchDemandProfit(from: string, to: string) {
  return apiRequest<{ products: DemandProfitRow[] }>(`/admin/reports/demand-profit?from=${from}&to=${to}`, {
    auth: true,
  }).then((r) => r.products)
}

export function fetchSalesByDay(from: string, to: string) {
  return apiRequest<{ days: SalesByDayRow[] }>(`/admin/reports/sales-by-day?from=${from}&to=${to}`, {
    auth: true,
  }).then((r) => r.days)
}

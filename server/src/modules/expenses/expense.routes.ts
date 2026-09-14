import { Router } from 'express'
import { asyncHandler, validateBody } from '../../middleware/validate.js'
import { authenticate, requireRole } from '../../middleware/auth.js'
import { createCategorySchema, createExpenseSchema } from './expense.schemas.js'
import * as expenseController from './expense.controller.js'

export const adminExpenseRouter = Router()
adminExpenseRouter.use(authenticate, requireRole('ADMIN'))

adminExpenseRouter.get('/expense-categories', asyncHandler(expenseController.listCategories))
adminExpenseRouter.post('/expense-categories', validateBody(createCategorySchema), asyncHandler(expenseController.createCategory))
adminExpenseRouter.delete('/expense-categories/:id', asyncHandler(expenseController.deleteCategory))

adminExpenseRouter.get('/expenses', asyncHandler(expenseController.listExpenses))
adminExpenseRouter.get('/expenses/summary', asyncHandler(expenseController.summary))
adminExpenseRouter.post('/expenses', validateBody(createExpenseSchema), asyncHandler(expenseController.createExpense))
adminExpenseRouter.delete('/expenses/:id', asyncHandler(expenseController.deleteExpense))

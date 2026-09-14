import { useEffect, useState, useCallback, type FormEvent } from 'react'
import {
  createExpense,
  createExpenseCategory,
  deleteExpense,
  fetchExpenseCategories,
  fetchExpenses,
  fetchExpenseSummary,
} from '../../lib/reports'
import { formatBdt } from '../../lib/format'
import { ApiError } from '../../lib/apiClient'
import { useI18n } from '../../context/LanguageContext'
import type { Expense, ExpenseCategory, ExpenseSummary } from '../../types/reports'
import './Admin.css'

function monthStart(): string {
  const d = new Date()
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-01`
}
function today(): string {
  return new Date().toISOString().slice(0, 10)
}

export function ExpensesAdmin() {
  const { t } = useI18n()
  const [categories, setCategories] = useState<ExpenseCategory[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [summary, setSummary] = useState<ExpenseSummary | null>(null)
  const [from, setFrom] = useState(monthStart())
  const [to, setTo] = useState(today())
  const [categoryId, setCategoryId] = useState('')
  const [amount, setAmount] = useState('')
  const [spentAt, setSpentAt] = useState(today())
  const [description, setDescription] = useState('')
  const [newCategory, setNewCategory] = useState('')
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    const [cats, exps, sum] = await Promise.all([
      fetchExpenseCategories(),
      fetchExpenses({ from, to }),
      fetchExpenseSummary(from, to),
    ])
    setCategories(cats)
    setExpenses(exps)
    setSummary(sum)
    if (!categoryId && cats[0]) setCategoryId(cats[0].id)
  }, [from, to, categoryId])

  useEffect(() => {
    void reload()
  }, [reload])

  async function handleRecord(event: FormEvent) {
    event.preventDefault()
    setError(null)
    const amt = Number(amount)
    if (!Number.isFinite(amt) || amt <= 0 || !categoryId) {
      setError(t('বৈধ ক্যাটাগরি ও পরিমাণ দিন', 'Provide a valid category and amount'))
      return
    }
    try {
      await createExpense({ categoryId, amount: amt, spentAt, description })
      setAmount('')
      setDescription('')
      await reload()
    } catch (err) {
      if (err instanceof ApiError && err.details?.length) setError(err.details.map((d) => d.message).join(' · '))
      else setError(err instanceof ApiError ? err.message : t('সংরক্ষণ করা যায়নি', 'Could not save'))
    }
  }

  async function handleAddCategory() {
    if (!newCategory.trim()) return
    try {
      await createExpenseCategory(newCategory.trim())
      setNewCategory('')
      await reload()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('ক্যাটাগরি যোগ করা যায়নি', 'Could not add category'))
    }
  }

  async function handleDelete(e: Expense) {
    if (!window.confirm(t('এই খরচ মুছবেন?', 'Delete this expense?'))) return
    await deleteExpense(e.id)
    await reload()
  }

  return (
    <section>
      <h1>{t('খরচ ব্যবস্থাপনা', 'Expense management')}</h1>

      <form className="admin-form" onSubmit={handleRecord} style={{ maxWidth: 640 }}>
        <h2>{t('নতুন খরচ', 'New expense')}</h2>
        {error && <div className="auth-error">{error}</div>}
        <div className="admin-form__row">
          <label>
            {t('ক্যাটাগরি', 'Category')}
            <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            {t('পরিমাণ (৳)', 'Amount (৳)')}
            <input type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} required />
          </label>
          <label>
            {t('তারিখ', 'Date')}
            <input type="date" value={spentAt} onChange={(e) => setSpentAt(e.target.value)} required />
          </label>
        </div>
        <label>
          {t('বিবরণ', 'Description')}
          <input value={description} onChange={(e) => setDescription(e.target.value)} required maxLength={200} />
        </label>
        <div className="admin-form__actions">
          <button type="submit">{t('খরচ রেকর্ড করুন', 'Record expense')}</button>
        </div>
      </form>

      <div className="inline-form">
        <input value={newCategory} onChange={(e) => setNewCategory(e.target.value)} placeholder={t('নতুন ক্যাটাগরি', 'New category')} />
        <button type="button" onClick={handleAddCategory}>{t('ক্যাটাগরি যোগ', 'Add category')}</button>
      </div>

      <div className="order-filters">
        <label className="date-filter">{t('থেকে', 'From')} <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></label>
        <label className="date-filter">{t('পর্যন্ত', 'To')} <input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></label>
      </div>

      {summary && (
        <div className="stat-row">
          <div className="stat">
            <span className="stat__label">{t('মোট খরচ', 'Total expenses')} ({from} — {to})</span>
            <span className="stat__value">{formatBdt(summary.total)}</span>
          </div>
          {summary.byCategory.slice(0, 3).map((c) => (
            <div className="stat" key={c.categoryId}>
              <span className="stat__label">{c.categoryName}</span>
              <span className="stat__value">{formatBdt(c.total)}</span>
            </div>
          ))}
        </div>
      )}

      <div className="table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>{t('তারিখ', 'Date')}</th>
              <th>{t('ক্যাটাগরি', 'Category')}</th>
              <th>{t('বিবরণ', 'Description')}</th>
              <th>{t('পরিমাণ', 'Amount')}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {expenses.map((e) => (
              <tr key={e.id}>
                <td>{e.spentAt}</td>
                <td>{e.categoryName}</td>
                <td>{e.description}</td>
                <td>{formatBdt(e.amount)}</td>
                <td className="admin-table__actions">
                  <button className="btn-danger" onClick={() => handleDelete(e)}>{t('মুছুন', 'Delete')}</button>
                </td>
              </tr>
            ))}
            {expenses.length === 0 && (
              <tr>
                <td colSpan={5} className="muted">{t('এই সময়ে কোনো খরচ নেই।', 'No expenses in this period.')}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}

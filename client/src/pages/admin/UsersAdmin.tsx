import { useEffect, useState, useCallback, type FormEvent } from 'react'
import { createUser, fetchUsers } from '../../lib/users'
import { ApiError } from '../../lib/apiClient'
import { useI18n } from '../../context/LanguageContext'
import type { Role } from '../../types/auth'
import type { AdminUser } from '../../types/user'
import './Admin.css'

const emptyForm = {
  name: '',
  email: '',
  phone: '',
  password: '',
  role: 'CUSTOMER' as Role,
}

export function UsersAdmin() {
  const { t } = useI18n()
  const [users, setUsers] = useState<AdminUser[]>([])
  const [form, setForm] = useState(emptyForm)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const roleLabel = (role: Role): string =>
    role === 'ADMIN' ? t('অ্যাডমিন', 'Admin') : role === 'KITCHEN' ? t('কিচেন', 'Kitchen') : t('গ্রাহক', 'Customer')

  const reload = useCallback(async () => {
    setLoading(true)
    try {
      setUsers(await fetchUsers())
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void reload()
  }, [reload])

  async function handleCreate(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setNotice(null)
    setSaving(true)
    try {
      const created = await createUser({
        name: form.name,
        email: form.email,
        phone: form.phone,
        password: form.password,
        role: form.role,
      })
      setForm({ ...emptyForm, role: form.role })
      setNotice(
        t(
          `${created.name} তৈরি হয়েছে — নিশ্চিতকরণের জন্য ইমেইল পাঠানো হয়েছে।`,
          `${created.name} created — a confirmation email has been sent to them.`,
        ),
      )
      await reload()
    } catch (err) {
      if (err instanceof ApiError && err.details?.length) setError(err.details.map((d) => d.message).join(' · '))
      else setError(err instanceof ApiError ? err.message : t('ব্যবহারকারী তৈরি করা যায়নি', 'Could not create user'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <section>
      <h1>{t('ব্যবহারকারী ব্যবস্থাপনা', 'User management')}</h1>
      <p className="muted">
        {t(
          'গ্রাহক, কিচেন বা অ্যাডমিন অ্যাকাউন্ট তৈরি করুন। কে তৈরি করেছে তা রেকর্ড রাখা হয়।',
          'Create customer, kitchen or admin accounts. Who created each account is recorded.',
        )}
      </p>

      <form className="admin-form" onSubmit={handleCreate} style={{ maxWidth: 640 }}>
        <h2>{t('নতুন ব্যবহারকারী', 'New user')}</h2>
        {error && <div className="auth-error">{error}</div>}
        {notice && <div className="hint hint--success">{notice}</div>}
        <div className="admin-form__row">
          <label>
            {t('নাম', 'Name')}
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required maxLength={150} />
          </label>
          <label>
            {t('রোল', 'Role')}
            <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as Role })}>
              <option value="CUSTOMER">{t('গ্রাহক', 'Customer')}</option>
              <option value="KITCHEN">{t('কিচেন', 'Kitchen')}</option>
              <option value="ADMIN">{t('অ্যাডমিন', 'Admin')}</option>
            </select>
          </label>
        </div>
        <div className="admin-form__row">
          <label>
            {t('ইমেইল', 'Email')}
            <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          </label>
          <label>
            {t('মোবাইল নম্বর', 'Mobile number')}
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              required
            />
          </label>
        </div>
        <label>
          {t('পাসওয়ার্ড', 'Password')}
          <input
            type="password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            required
            minLength={8}
            placeholder={t('অন্তত ৮ অক্ষর', 'At least 8 characters')}
          />
        </label>
        <div className="admin-form__actions">
          <button type="submit" disabled={saving}>
            {saving ? t('তৈরি হচ্ছে…', 'Creating…') : t('ব্যবহারকারী তৈরি করুন', 'Create user')}
          </button>
        </div>
      </form>

      <h2>{t('সব ব্যবহারকারী', 'All users')}</h2>
      {loading ? (
        <p className="muted">{t('লোড হচ্ছে…', 'Loading…')}</p>
      ) : (
        <div className="table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>{t('নাম', 'Name')}</th>
                <th>{t('ইমেইল', 'Email')}</th>
                <th>{t('রোল', 'Role')}</th>
                <th>{t('স্ট্যাটাস', 'Status')}</th>
                <th>{t('তৈরি করেছেন', 'Created by')}</th>
                <th>{t('তারিখ', 'Date')}</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>{u.name}</td>
                  <td>{u.email}</td>
                  <td>
                    <span className={`role-badge role-badge--${u.role.toLowerCase()}`}>{roleLabel(u.role)}</span>
                  </td>
                  <td>{u.isActive ? t('সক্রিয়', 'Active') : t('নিষ্ক্রিয়', 'Inactive')}</td>
                  <td>{u.createdBy ? u.createdBy.name : <span className="muted">{t('সেলফ / সিস্টেম', 'Self / system')}</span>}</td>
                  <td>{u.createdAt.slice(0, 10)}</td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={6} className="muted">
                    {t('কোনো ব্যবহারকারী নেই।', 'No users yet.')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

import { useEffect, useState, type FormEvent } from 'react'
import { useAuth } from '../context/AuthContext'
import { useI18n } from '../context/LanguageContext'
import { ApiError } from '../lib/apiClient'
import { createAddress, deleteAddress, fetchAddresses, updateAddress } from '../lib/orders'
import type { Address, AddressInput } from '../types/order'
import './AddressBook.css'

function emptyAddress(name = '', phone = ''): AddressInput {
  return {
    label: '',
    recipientName: name,
    recipientPhone: phone,
    addressLine: '',
    area: '',
    city: 'Dhaka',
    note: '',
    isDefault: false,
  }
}

/// Customer address book: list saved delivery addresses, add/edit/delete them,
/// and choose which one is the default (used to pre-fill checkout). Exactly one
/// address is the default at a time; the first address added is always default.
export function AddressBook() {
  const { user } = useAuth()
  const { t } = useI18n()

  const [addresses, setAddresses] = useState<Address[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  // The form is shown either to add a new address (editingId null) or to edit an
  // existing one (editingId set). Hidden entirely when `showForm` is false.
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<AddressInput>(emptyAddress())

  useEffect(() => {
    fetchAddresses()
      .then(setAddresses)
      .catch(() => setError(t('ঠিকানা লোড করা যায়নি', 'Could not load addresses')))
      .finally(() => setLoading(false))
    // Intentionally run once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function openAdd() {
    setEditingId(null)
    setForm(emptyAddress(user?.name ?? '', user?.phone ?? ''))
    setShowForm(true)
    setError(null)
  }

  function openEdit(a: Address) {
    setEditingId(a.id)
    setForm({
      label: a.label ?? '',
      recipientName: a.recipientName,
      recipientPhone: a.recipientPhone,
      addressLine: a.addressLine,
      area: a.area ?? '',
      city: a.city,
      note: a.note ?? '',
      isDefault: a.isDefault,
    })
    setShowForm(true)
    setError(null)
  }

  function closeForm() {
    setShowForm(false)
    setEditingId(null)
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError(null)
    // The first address a customer saves is always the default.
    const isFirst = addresses.length === 0
    const payload: AddressInput = { ...form, isDefault: isFirst ? true : form.isDefault }
    try {
      if (editingId) {
        await updateAddress(editingId, payload)
      } else {
        await createAddress(payload)
      }
      setAddresses(await fetchAddresses())
      closeForm()
    } catch (err) {
      if (err instanceof ApiError && err.details?.length) {
        setError(err.details.map((d) => d.message).join(' · '))
      } else {
        setError(err instanceof ApiError ? err.message : t('সংরক্ষণ করা যায়নি', 'Could not save the address'))
      }
    } finally {
      setBusy(false)
    }
  }

  async function handleSetDefault(a: Address) {
    if (a.isDefault) return
    setBusy(true)
    setError(null)
    try {
      await updateAddress(a.id, { isDefault: true })
      setAddresses(await fetchAddresses())
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('আপডেট করা যায়নি', 'Could not update'))
    } finally {
      setBusy(false)
    }
  }

  async function handleDelete(a: Address) {
    if (!window.confirm(t('এই ঠিকানা মুছে ফেলবেন?', 'Delete this address?'))) return
    setBusy(true)
    setError(null)
    try {
      await deleteAddress(a.id)
      const next = await fetchAddresses()
      // If the default was removed and others remain, promote the first so there
      // is always a default to pre-fill checkout with.
      if (next.length > 0 && !next.some((x) => x.isDefault)) {
        await updateAddress(next[0].id, { isDefault: true })
        setAddresses(await fetchAddresses())
      } else {
        setAddresses(next)
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('মুছে ফেলা যায়নি', 'Could not delete'))
    } finally {
      setBusy(false)
    }
  }

  const isFirst = addresses.length === 0

  return (
    <section className="profile__card addressbook" id="addresses">
      <div className="addressbook__head">
        <h2>{t('ডেলিভারি ঠিকানা', 'Delivery addresses')}</h2>
        {!showForm && (
          <button type="button" className="btn btn--brand btn--sm" onClick={openAdd}>
            {t('নতুন ঠিকানা', 'Add address')}
          </button>
        )}
      </div>

      {error && <div className="auth-error">{error}</div>}

      {loading ? (
        <p className="muted">{t('লোড হচ্ছে…', 'Loading…')}</p>
      ) : (
        <>
          {addresses.length === 0 && !showForm && (
            <p className="muted addressbook__empty">
              {t(
                'এখনও কোনো ঠিকানা যোগ করা হয়নি। চেকআউটে ব্যবহার করতে একটি ঠিকানা যোগ করুন।',
                'No addresses yet. Add one to use it at checkout.',
              )}
            </p>
          )}

          {addresses.length > 0 && (
            <ul className="addressbook__list">
              {addresses.map((a) => (
                <li key={a.id} className={a.isDefault ? 'addr-item addr-item--default' : 'addr-item'}>
                  <div className="addr-item__body">
                    <div className="addr-item__top">
                      {a.label && <span className="addr-item__label">{a.label}</span>}
                      {a.isDefault && (
                        <span className="addr-item__badge">{t('ডিফল্ট', 'Default')}</span>
                      )}
                    </div>
                    <strong>{a.recipientName}</strong> · {a.recipientPhone}
                    <div className="addr-item__line">
                      {a.addressLine}
                      {a.area ? `, ${a.area}` : ''}, {a.city}
                    </div>
                    {a.note && <div className="addr-item__note">{a.note}</div>}
                  </div>
                  <div className="addr-item__actions">
                    {!a.isDefault && (
                      <button type="button" className="linkbtn" disabled={busy} onClick={() => handleSetDefault(a)}>
                        {t('ডিফল্ট করুন', 'Set default')}
                      </button>
                    )}
                    <button type="button" className="linkbtn" disabled={busy} onClick={() => openEdit(a)}>
                      {t('এডিট', 'Edit')}
                    </button>
                    <button type="button" className="linkbtn linkbtn--danger" disabled={busy} onClick={() => handleDelete(a)}>
                      {t('মুছুন', 'Delete')}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {showForm && (
            <form className="addressbook__form" onSubmit={handleSubmit}>
              <h3>{editingId ? t('ঠিকানা এডিট করুন', 'Edit address') : t('নতুন ঠিকানা', 'New address')}</h3>
              <label>
                {t('লেবেল (ঐচ্ছিক)', 'Label (optional)')}
                <input
                  value={form.label ?? ''}
                  onChange={(e) => setForm({ ...form, label: e.target.value })}
                  placeholder={t('বাসা, অফিস…', 'Home, Office…')}
                  maxLength={60}
                />
              </label>
              <div className="addressbook__row">
                <label>
                  {t('প্রাপকের নাম', 'Recipient name')}
                  <input
                    value={form.recipientName}
                    onChange={(e) => setForm({ ...form, recipientName: e.target.value })}
                    required
                  />
                </label>
                <label>
                  {t('ফোন', 'Phone')}
                  <input
                    value={form.recipientPhone}
                    onChange={(e) => setForm({ ...form, recipientPhone: e.target.value })}
                    required
                  />
                </label>
              </div>
              <label>
                {t('ঠিকানা', 'Address')}
                <input
                  value={form.addressLine}
                  onChange={(e) => setForm({ ...form, addressLine: e.target.value })}
                  required
                />
              </label>
              <div className="addressbook__row">
                <label>
                  {t('এলাকা', 'Area')}
                  <input value={form.area ?? ''} onChange={(e) => setForm({ ...form, area: e.target.value })} />
                </label>
                <label>
                  {t('শহর', 'City')}
                  <input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} required />
                </label>
              </div>
              <label>
                {t('নোট (ঐচ্ছিক)', 'Note (optional)')}
                <input value={form.note ?? ''} onChange={(e) => setForm({ ...form, note: e.target.value })} maxLength={300} />
              </label>
              <label className="addressbook__check">
                <input
                  type="checkbox"
                  checked={isFirst ? true : !!form.isDefault}
                  disabled={isFirst}
                  onChange={(e) => setForm({ ...form, isDefault: e.target.checked })}
                />
                {isFirst
                  ? t('এটি ডিফল্ট ঠিকানা হবে', 'This will be your default address')
                  : t('ডিফল্ট ঠিকানা হিসেবে সেট করুন', 'Set as default address')}
              </label>
              <div className="addressbook__formactions">
                <button type="submit" className="btn btn--brand" disabled={busy}>
                  {busy ? t('সংরক্ষণ হচ্ছে…', 'Saving…') : t('সংরক্ষণ', 'Save')}
                </button>
                <button type="button" className="btn" onClick={closeForm} disabled={busy}>
                  {t('বাতিল', 'Cancel')}
                </button>
              </div>
            </form>
          )}
        </>
      )}
    </section>
  )
}

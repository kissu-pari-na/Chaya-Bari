import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  clearAllNotifications,
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type AppNotification,
} from '../lib/notifications'
import { renderNotification } from '../lib/notificationText'
import { usePoll } from '../lib/usePoll'
import { useI18n } from '../context/LanguageContext'
import './NotificationBell.css'

export function NotificationBell() {
  const { t, lang } = useI18n()
  const [items, setItems] = useState<AppNotification[]>([])
  const [unread, setUnread] = useState(0)
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()

  const load = useCallback(async () => {
    try {
      const { notifications, unread } = await fetchNotifications()
      setItems(notifications)
      setUnread(unread)
    } catch {
      // ignore transient errors
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  // Near-live: poll for new notifications and refetch on focus/visibility.
  usePoll(() => {
    void load()
  }, 20000)

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  async function handleMarkAll() {
    await markAllNotificationsRead()
    await load()
  }

  async function handleClearAll() {
    await clearAllNotifications()
    await load()
  }

  async function handleItem(n: AppNotification) {
    if (!n.read) {
      await markNotificationRead(n.id)
      await load()
    }
    // Navigate to the notification's destination, if it has one.
    const target = n.link ?? (n.orderId ? `/orders/${n.orderId}` : null)
    if (target) {
      setOpen(false)
      navigate(target)
    }
  }

  return (
    <div className="notif" ref={ref}>
      <button className="notif__btn" onClick={() => setOpen((o) => !o)} aria-label={t('নোটিফিকেশন', 'Notifications')}>
        🔔
        {unread > 0 && <span className="notif__badge">{unread > 9 ? '9+' : unread}</span>}
      </button>
      {open && (
        <div className="notif__panel">
          <div className="notif__head">
            <span>{t('নোটিফিকেশন', 'Notifications')}</span>
            <span className="notif__actions">
              {unread > 0 && (
                <button className="notif__markall" onClick={handleMarkAll}>
                  {t('সব পড়া হয়েছে', 'Mark all read')}
                </button>
              )}
              {items.length > 0 && (
                <button className="notif__clear" onClick={handleClearAll}>
                  {t('সব মুছুন', 'Clear all')}
                </button>
              )}
            </span>
          </div>
          <div className="notif__list">
            {items.length === 0 && <p className="notif__empty">{t('কোনো নোটিফিকেশন নেই।', 'No notifications.')}</p>}
            {items.map((n) => {
              const text = renderNotification(n)
              return (
                <button
                  key={n.id}
                  className={n.read ? 'notif__item' : 'notif__item notif__item--unread'}
                  onClick={() => handleItem(n)}
                >
                  <span className="notif__title">{text.title}</span>
                  <span className="notif__body">{text.body}</span>
                  <span className="notif__time">{new Date(n.createdAt).toLocaleString(lang === 'bn' ? 'bn-BD' : 'en-GB')}</span>
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

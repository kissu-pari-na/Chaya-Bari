import { useCallback, useEffect, useRef, useState } from 'react'
import {
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type AppNotification,
} from '../lib/notifications'
import './NotificationBell.css'

export function NotificationBell() {
  const [items, setItems] = useState<AppNotification[]>([])
  const [unread, setUnread] = useState(0)
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

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
    const t = setInterval(load, 30000)
    return () => clearInterval(t)
  }, [load])

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

  async function handleItem(n: AppNotification) {
    if (!n.read) {
      await markNotificationRead(n.id)
      await load()
    }
  }

  return (
    <div className="notif" ref={ref}>
      <button className="notif__btn" onClick={() => setOpen((o) => !o)} aria-label="নোটিফিকেশন">
        🔔
        {unread > 0 && <span className="notif__badge">{unread > 9 ? '9+' : unread}</span>}
      </button>
      {open && (
        <div className="notif__panel">
          <div className="notif__head">
            <span>নোটিফিকেশন</span>
            {unread > 0 && (
              <button className="notif__markall" onClick={handleMarkAll}>
                সব পড়া হয়েছে
              </button>
            )}
          </div>
          <div className="notif__list">
            {items.length === 0 && <p className="notif__empty">কোনো নোটিফিকেশন নেই।</p>}
            {items.map((n) => (
              <button
                key={n.id}
                className={n.read ? 'notif__item' : 'notif__item notif__item--unread'}
                onClick={() => handleItem(n)}
              >
                <span className="notif__title">{n.title}</span>
                <span className="notif__body">{n.body}</span>
                <span className="notif__time">{new Date(n.createdAt).toLocaleString('en-GB')}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

/* Chaya Bari service worker — Web Push.
 * Shows OS-level notifications for pushes and opens the relevant page on click.
 */

self.addEventListener('push', (event) => {
  let data = {}
  try {
    data = event.data ? event.data.json() : {}
  } catch (e) {
    data = {}
  }
  const title = data.title || 'ছায়া বাড়ি'
  const options = {
    body: data.body || '',
    icon: '/favicon-32.png',
    badge: '/favicon-32.png',
    // A tag collapses repeated updates for the same order into one entry.
    tag: data.tag || undefined,
    renotify: !!data.tag,
    data: { url: data.url || '/' },
  }
  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = (event.notification.data && event.notification.data.url) || '/'
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Focus an existing tab on the target path if one is open; else open one.
      for (const client of clientList) {
        try {
          const path = new URL(client.url).pathname
          if (path === url && 'focus' in client) return client.focus()
        } catch (e) {
          /* ignore */
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(url)
      return undefined
    }),
  )
})

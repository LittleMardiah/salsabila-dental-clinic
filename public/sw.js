self.addEventListener('push', (event) => {
  const data = event.data.json()
  const options = {
    body: data.body,
    icon: '/logo.png',
    badge: '/badge.png',
    vibrate: [200, 100, 200],
    sound: '/sounds/notification.mp3',
  }
  event.waitUntil(self.registration.showNotification(data.title, options))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(clients.openWindow('/patient/queue'))
})
/* Salsa Dental patient PWA — intentionally tiny: no page caching, no stale EMR. */
const ICON_CACHE = 'salsa-patient-static-v1'
const STATIC_ASSETS = ['/icons/icon-192.png', '/icons/icon-512.png', '/icons/apple-touch-icon.png']

self.addEventListener('install', (event) => {
  self.skipWaiting()
  event.waitUntil(
    caches
      .open(ICON_CACHE)
      .then((cache) => cache.addAll(STATIC_ASSETS))
      .catch(() => undefined)
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener('fetch', (event) => {
  const request = event.request
  if (request.method !== 'GET') return
  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

  // Only icons come from cache; every clinical response stays network-fresh.
  if (STATIC_ASSETS.includes(url.pathname)) {
    event.respondWith(
      caches.match(request).then((cached) => cached || fetch(request))
    )
  }
})

self.addEventListener('push', (event) => {
  let payload = {}
  try {
    payload = event.data ? event.data.json() : {}
  } catch (error) {
    payload = { title: 'Salsa Dental', body: 'Ada pembaruan dari klinik.' }
  }
  event.waitUntil(
    self.registration.showNotification(payload.title || 'Salsa Dental', {
      body: payload.body || 'Pantau antrean dan jadwal kontrol Anda.',
      icon: '/icons/icon-192.png',
      badge: '/icons/favicon-32.png',
      data: { url: payload.url || '/pasien/beranda' },
    })
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const target = event.notification.data?.url || '/pasien/beranda'
  event.waitUntil(self.clients.openWindow(target))
})
